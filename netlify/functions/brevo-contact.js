exports.handler = async function (event) {
  console.log("[brevo-contact] Request method:", event.httpMethod);
  console.log("[brevo-contact] Raw body:", event.body);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST"
      },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  var apiKey = process.env.BREVO_API_KEY;
  console.log("[brevo-contact] BREVO_API_KEY exists:", Boolean(apiKey));

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Brevo API key is not configured" })
    };
  }

  var body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {
    console.log("[brevo-contact] JSON parse error:", error.message);

    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  var nome = String(body.nome || "").trim();
  var email = String(body.email || "").trim();
  var telefone = String(body.telefone || "").trim();
  var mensagem = String(body.mensagem || "").trim();

  console.log("[brevo-contact] Parsed fields:", {
    nome: nome,
    email: email,
    telefone: telefone,
    mensagem: mensagem
  });

  if (!email) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Email is required" })
    };
  }

  var brevoPayload = {
    email: email,
    updateEnabled: true,
    attributes: {
      NOME: nome,
      TELEFONE: telefone,
      MESSAGE: mensagem
    }
  };

  if (process.env.BREVO_LIST_IDS) {
    brevoPayload.listIds = process.env.BREVO_LIST_IDS
      .split(",")
      .map(function (listId) {
        return Number(listId.trim());
      })
      .filter(function (listId) {
        return Number.isInteger(listId) && listId > 0;
      });
  }

  console.log("[brevo-contact] Brevo payload:", brevoPayload);

  try {
    var brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(brevoPayload)
    });

    var brevoText = await brevoResponse.text();

    console.log("[brevo-contact] Brevo response status:", brevoResponse.status);
    console.log("[brevo-contact] Brevo response text:", brevoText);

    if (!brevoResponse.ok) {
      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Brevo request failed",
          brevoStatus: brevoResponse.status,
          brevoResponse: brevoText
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        brevoStatus: brevoResponse.status,
        brevoResponse: brevoText
      })
    };
  } catch (error) {
    console.log("[brevo-contact] Fetch error:", error.message);

    return {
      statusCode: 502,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Unable to contact Brevo",
        details: error.message
      })
    };
  }
};
