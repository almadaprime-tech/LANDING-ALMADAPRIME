(function () {
  const form = document.querySelector("[data-mailerlite-form]");

  if (!form) {
    return;
  }

  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector("button[type='submit']");
  const initialButtonText = submitButton ? submitButton.textContent : "";

  const setStatus = (type, message) => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.state = type;
  };

  const setLoading = (isLoading) => {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "A enviar..." : initialButtonText;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const nome = formData.get("nome")?.trim();
    const email = formData.get("email")?.trim();
    const telefone = formData.get("telefone")?.trim();
    const mensagem = formData.get("mensagem")?.trim();

    if (!email) {
      setStatus("error", "Indique um email para receber a informação privada.");
      return;
    }

    setLoading(true);
    setStatus("idle", "");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          mensagem
        })
      });

      if (!response.ok) {
        throw new Error("Contact request failed");
      }

      form.reset();
      setStatus("success", "Pedido recebido. Entraremos em contacto de forma privada e discreta.");
    } catch (error) {
      setStatus("error", "Não foi possível enviar o pedido. Tente novamente ou contacte-nos directamente.");
    } finally {
      setLoading(false);
    }
  });
})();
