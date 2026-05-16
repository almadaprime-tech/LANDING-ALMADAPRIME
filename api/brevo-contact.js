const BREVO_CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";

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
  const nameAttribute = process.env.BREVO_NAME_ATTRIBUTE || "FIRSTNAME";
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Brevo API key is not configured" });
  }

  const { nome = "", email = "", telefone = "", mensagem = "" } = parseBody(req.body);
  const trimmedEmail = String(email).trim();

  if (!trimmedEmail) {
    return res.status(400).json({ error: "Email is required" });
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

    if (!brevoResponse.ok) {
      return res.status(502).json({ error: "Brevo request failed" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(502).json({ error: "Unable to contact Brevo" });
  }
};
