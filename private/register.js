document.addEventListener('DOMContentLoaded', () => {
  const nombreInput = document.getElementById('nombreInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const registerButton = document.getElementById('registerButton');
  const mensaje = document.getElementById('mensaje');

  registerButton.addEventListener('click', async () => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error registrando usuario';
      return;
    }

    mensaje.textContent = 'Cuenta creada. Ahora puedes iniciar sesión.';
  });
});