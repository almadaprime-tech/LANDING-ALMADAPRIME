exports.handler = async function (event) {
  try {
    const { nome, email, telefone, mensagem } = JSON.parse(event.body);

    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
        "Content-Type": "application/json"
      },
   body: JSON.stringify({
  email: email,

  fields: {
    nome: nome,
    telefone: telefone,
    mensagem: mensagem
  }
})
    });

    const data = await response.text();

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "MailerLite request failed",
          details: data
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
