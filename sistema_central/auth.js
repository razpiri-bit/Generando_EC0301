// =====================================================================
// MÓDULO DE AUTENTICACIÓN REAL (auth.js)
// Flujo: Login con Código de Acceso (Passwordless)
// =====================================================================
// Este archivo maneja la lógica del *frontend* para la autenticación.
// Llama a tu backend en Render para validar el código y manejar sesiones.
// =====================================================================

(function(window) {
    const TOKEN_KEY = 'skills_cert_token'; // Clave para el token de sesión (JWT)
    
    // (AJUSTE) URL de tu backend en Render
    const API_BASE_URL = 'https://generando-ec0301-backend.onrender.com/api/auth';

    const auth = {
        /**
         * Muestra un popup para ingresar el código de acceso y loguearse.
         * @returns {Promise<boolean>} Resuelve 'true' si el login fue exitoso.
         */
        login: async function() {
            const { value: code } = await Swal.fire({
                title: 'Iniciar Sesión',
                text: 'Ingresa el código de acceso que recibiste por WhatsApp:',
                input: 'text',
                inputPlaceholder: 'EJEMPLO: AB12CD',
                inputAttributes: {
                    maxlength: 10,
                    autocapitalize: 'off',
                    autocorrect: 'off'
                },
                focusConfirm: false,
                confirmButtonText: 'Validar Código',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value) {
                        return '¡Necesitas escribir un código!'
                    }
                }
            });

            if (code) {
                try {
                    Swal.fire({
                        title: 'Validando...',
                        text: 'Verificando tu código de acceso.',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    // Llamar al backend para validar el código
                    const response = await fetch(`${API_BASE_URL}/login-code`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ accessCode: code })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Código inválido o expirado');
                    }

                    // ¡Éxito! Guardar el token de sesión (JWT)
                    if (data.token) {
                        localStorage.setItem(TOKEN_KEY, data.token);
                        Swal.close();
                        Swal.fire({
                            icon: 'success',
                            title: '¡Bienvenido!',
                            text: data.message || 'Has iniciado sesión correctamente.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        return true; // Login exitoso
                    } else {
                        throw new Error('No se recibió token del servidor.');
                    }

                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de Autenticación',
                        text: error.message
                    });
                    return false; // Login fallido
                }
            }
            return false; // Login cancelado
        },

        /**
         * Cierra la sesión del usuario limpiando el token.
         */
        logout: async function() {
            localStorage.removeItem(TOKEN_KEY);
            console.log("Sesión cerrada.");
            // En una app real, podrías notificar al backend para invalidar el token
            // await fetch(`${API_BASE_URL}/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        },

        /**
         * Obtiene el token de sesión guardado.
         * @returns {string|null}
         */
        getToken: function() {
            return localStorage.getItem(TOKEN_KEY);
        },

        /**
         * Decodifica el token (JWT) para obtener los datos del usuario.
         * @returns {Object|null} Objeto de usuario { email, ... }
         */
        decodeToken: function(token) {
            try {
                // Decodifica la parte "payload" (la de en medio) del JWT
                const payloadBase64 = token.split('.')[1];
                const payloadJson = atob(payloadBase64);
                return JSON.parse(payloadJson);
            } catch (e) {
                console.error("Error decodificando token:", e);
                return null;
            }
        },

        /**
         * Verifica si el usuario está actualmente logueado (tiene un token válido).
         * @returns {boolean}
         */
        isLoggedIn: function() {
            const token = this.getToken();
            if (!token) {
                return false;
            }
            
            // Revisa si el token ha expirado
            const payload = this.decodeToken(token);
            if (!payload || !payload.exp) {
                // Token inválido o sin fecha de expiración
                localStorage.removeItem(TOKEN_KEY); // Limpiar token malo
                return false;
            }

            const isExpired = Date.now() >= (payload.exp * 1000); // payload.exp está en segundos

            if (isExpired) {
                console.log("Token expirado. Cerrando sesión.");
                this.logout();
                return false;
            }

            return true;
        },

        /**
         * Obtiene los datos del usuario desde el token guardado.
         * @returns {Object|null} Objeto de usuario { email, ... }
         */
        getUser: function() {
            if (!this.isLoggedIn()) {
                return null;
            }
            const token = this.getToken();
            return this.decodeToken(token); // Devuelve el payload del token
        }
    };

    // Exponer el objeto auth globalmente
    window.auth = auth;

})(window);
