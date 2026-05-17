const BREVO_CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";

const jsonResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    ...headers
  },
  body: JSON.stringify(body)
});

const parseListIds = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
};

const parseBody = (body) => {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }

  return body;
};

const buildAttributes = ({ nome, telefone, mensagem }) => {
  const attributes = {};
  const nameAttribute = process.env.BREVO_NAME_ATTRIBUTE || "NOME";
  const phoneAttribute = process.env.BREVO_PHONE_ATTRIBUTE || "TELEFONE";
  const messageAttribute = process.env.BREVO_MESSAGE_ATTRIBUTE || "MESSAGE";

  if (nome && nameAttribute) {
    attributes[nameAttribute] = nome;
  }

  if (telefone && phoneAttribute) {
    attributes[phoneAttribute] = telefone;
  }

  if (mensagem && messageAttribute) {
    attributes[messageAttribute] = mensagem;
  }

  return attributes;
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(
      405,
      { error: "Method not allowed" },
      { allow: "POST" }
    );
  }

  const apiKey = process.env.BREVO_API_KEY;
  console.log("[brevo-contact] BREVO_API_KEY exists:", Boolean(apiKey));

  if (!apiKey) {
    return jsonResponse(500, { error: "Brevo API key is not configured" });
  }

  const { nome = "", email = "", telefone = "", mensagem = "" } = parseBody(event.body);
  const trimmedEmail = String(email).trim();

  if (!trimmedEmail) {
    return jsonResponse(400, { error: "Email is required" });
  }

  const payload = {
    email: trimmedEmail,
    updateEnabled: true,
    attributes: buildAttributes({
      nome: String(nome).trim(),
      telefone: String(telefone).trim(),
      mensagem: String(mensagem).trim()
    })
  };

  const listIds = parseListIds(process.env.BREVO_LIST_IDS);

  if (listIds.length > 0) {
    payload.listIds = listIds;
  }

  try {
    const brevoResponse = await fetch(BREVO_CONTACTS_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const brevoResponseText = await brevoResponse.text();

    console.log("[brevo-contact] Brevo response status:", brevoResponse.status);
    console.log("[brevo-contact] Brevo response text:", brevoResponseText);

    if (!brevoResponse.ok) {
      return jsonResponse(502, { error: "Brevo request failed" });
    }

    return jsonResponse(200, { success: true });
  } catch (error) {
    return jsonResponse(502, { error: "Unable to contact Brevo" });
  }
};
