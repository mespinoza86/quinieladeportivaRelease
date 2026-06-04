document.addEventListener('DOMContentLoaded', () => {
  const nombreInput = document.getElementById('nombreInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const registerButton = document.getElementById('registerButton');
  const mensaje = document.getElementById('mensaje');

  registerButton.addEventListener('click', async () => {
    try {
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

      mensaje.textContent = 'Cuenta creada. Revisa tu correo para activar la cuenta antes de iniciar sesión.';

    } catch (error) {
      console.error('Error registrando usuario:', error);
      mensaje.textContent = 'Error conectando con el servidor.';
    }
  });
});