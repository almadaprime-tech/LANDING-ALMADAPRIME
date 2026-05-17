var https = require("https");

var BREVO_CONTACTS_HOST = "api.brevo.com";
var BREVO_CONTACTS_PATH = "/v3/contacts";

function response(statusCode, payload, headers) {
  return {
    statusCode: statusCode,
    headers: Object.assign(
      {
        "Content-Type": "application/json"
      },
      headers || {}
    ),
    body: JSON.stringify(payload)
  };
}

function parseJsonBody(body) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    console.log("[brevo-contact] Invalid JSON body:", error.message);
    return {};
  }
}

function cleanString(value) {
  return String(value || "").trim();
}

function parseListIds(value) {
  return cleanString(value)
    .split(",")
    .map(function (item) {
      return Number(item.trim());
    })
    .filter(function (item) {
      return Number.isInteger(item) && item > 0;
    });
}

function buildAttributes(data) {
  var attributes = {};
  var nameAttribute = process.env.BREVO_NAME_ATTRIBUTE || "NOME";
  var phoneAttribute = process.env.BREVO_PHONE_ATTRIBUTE || "TELEFONE";
  var messageAttribute = process.env.BREVO_MESSAGE_ATTRIBUTE || "MESSAGE";

  if (data.nome) {
    attributes[nameAttribute] = data.nome;
  }

  if (data.telefone) {
    attributes[phoneAttribute] = data.telefone;
  }

  if (data.mensagem) {
    attributes[messageAttribute] = data.mensagem;
  }

  return attributes;
}

function buildBrevoPayload(data) {
  var payload = {
    email: data.email,
    updateEnabled: true,
    attributes: buildAttributes({
      nome: data.nome,
      telefone: data.telefone,
      mensagem: data.mensagem
    })
  };
  var listIds = parseListIds(process.env.BREVO_LIST_IDS);

  if (listIds.length > 0) {
    payload.listIds = listIds;
  }

  return payload;
}

function sendBrevoRequest(apiKey, payload) {
  var requestBody = JSON.stringify(payload);
  var requestOptions = {
    hostname: BREVO_CONTACTS_HOST,
    path: BREVO_CONTACTS_PATH,
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
      "content-length": Buffer.byteLength(requestBody)
    }
  };

  return new Promise(function (resolve, reject) {
    var request = https.request(requestOptions, function (brevoResponse) {
      var responseBody = "";

      brevoResponse.setEncoding("utf8");

      brevoResponse.on("data", function (chunk) {
        responseBody += chunk;
      });

      brevoResponse.on("end", function () {
        resolve({
          statusCode: brevoResponse.statusCode,
          body: responseBody
        });
      });
    });

    request.on("error", function (error) {
      reject(error);
    });

    request.write(requestBody);
    request.end();
  });
}

exports.handler = async function (event) {
  console.log("[brevo-contact] Request method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return response(
      405,
      { error: "Method not allowed" },
      { Allow: "POST" }
    );
  }

  var apiKey = process.env.BREVO_API_KEY;
  console.log("[brevo-contact] BREVO_API_KEY exists:", Boolean(apiKey));

  if (!apiKey) {
    return response(500, { error: "Brevo API key is not configured" });
  }

  var body = parseJsonBody(event.body);
  var nome = cleanString(body.nome);
  var email = cleanString(body.email);
  var telefone = cleanString(body.telefone);
  var mensagem = cleanString(body.mensagem);
  var listIds = parseListIds(process.env.BREVO_LIST_IDS);

  console.log("[brevo-contact] Payload fields:", {
    hasNome: Boolean(nome),
    hasEmail: Boolean(email),
    hasTelefone: Boolean(telefone),
    hasMensagem: Boolean(mensagem),
    listIds: listIds
  });

  if (!email) {
    return response(400, { error: "Email is required" });
  }

  var brevoPayload = buildBrevoPayload({
    nome: nome,
    email: email,
    telefone: telefone,
    mensagem: mensagem
  });

  try {
    var brevoResult = await sendBrevoRequest(apiKey, brevoPayload);

    console.log("[brevo-contact] Brevo response status:", brevoResult.statusCode);
    console.log("[brevo-contact] Brevo response text:", brevoResult.body);

    if (brevoResult.statusCode < 200 || brevoResult.statusCode >= 300) {
      return response(502, {
        error: "Brevo request failed",
        brevoStatus: brevoResult.statusCode
      });
    }

    return response(200, { success: true });
  } catch (error) {
    console.log("[brevo-contact] Brevo request error:", error.message);

    return response(502, { error: "Unable to contact Brevo" });
  }
};
