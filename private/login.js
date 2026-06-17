document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginButton = document.getElementById('loginButton');
  const mensaje = document.getElementById('mensaje');

  loginButton.addEventListener('click', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error iniciando sesión';
      return;
    }

    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/mis-quinielas.html';
  });
});