import { availableLanguages } from "../config";

type Language = "en" | "pt-BR" | "es";

interface AuthTranslations {
  login: {
    success: string;
    error: {
      invalidCredentials: string;
      networkError: string;
      userNotFound: string;
      accountLocked: string;
      generic: string;
    };
    loading: string;
  };
  logout: {
    success: string;
    error: string;
  };
  siwe: {
    connectWallet: string;
    signMessage: string;
    verifying: string;
    error: {
      walletNotFound: string;
      signatureRejected: string;
      networkError: string;
      generic: string;
    };
  };
  session: {
    expired: string;
    invalid: string;
  };
}

interface CommonTranslations {
  error: string;
  loading: string;
  retry: string;
  cancel: string;
  success: string;
}

interface Translations {
  [key: string]: {
    auth: AuthTranslations;
    common: CommonTranslations;
  };
}

const translations: Translations = {
  en: {
    auth: {
      login: {
        success: "Successfully logged in",
        error: {
          invalidCredentials: "Invalid email or password",
          networkError: "Network error. Please check your connection",
          userNotFound: "User not found",
          accountLocked: "Account is locked. Please contact support",
          generic: "Login failed. Please try again"
        },
        loading: "Signing in..."
      },
      logout: {
        success: "Successfully logged out",
        error: "Logout failed. Please try again"
      },
      siwe: {
        connectWallet: "Connect Wallet",
        signMessage: "Sign Message",
        verifying: "Verifying signature...",
        error: {
          walletNotFound: "No Ethereum wallet found. Please install MetaMask or similar",
          signatureRejected: "Signature rejected by user",
          networkError: "Network error during wallet connection",
          generic: "Wallet authentication failed"
        }
      },
      session: {
        expired: "Your session has expired. Please log in again",
        invalid: "Invalid session. Please log in again"
      }
    },
    common: {
      error: "Error",
      loading: "Loading...",
      retry: "Retry",
      cancel: "Cancel",
      success: "Success"
    }
  },
  "pt-BR": {
    auth: {
      login: {
        success: "Login realizado com sucesso",
        error: {
          invalidCredentials: "E-mail ou senha inválidos",
          networkError: "Erro de rede. Verifique sua conexão",
          userNotFound: "Usuário não encontrado",
          accountLocked: "Conta bloqueada. Entre em contato com o suporte",
          generic: "Falha no login. Tente novamente"
        },
        loading: "Entrando..."
      },
      logout: {
        success: "Logout realizado com sucesso",
        error: "Falha no logout. Tente novamente"
      },
      siwe: {
        connectWallet: "Conectar Carteira",
        signMessage: "Assinar Mensagem",
        verifying: "Verificando assinatura...",
        error: {
          walletNotFound: "Nenhuma carteira Ethereum encontrada. Instale MetaMask ou similar",
          signatureRejected: "Assinatura rejeitada pelo usuário",
          networkError: "Erro de rede durante conexão da carteira",
          generic: "Falha na autenticação da carteira"
        }
      },
      session: {
        expired: "Sua sessão expirou. Faça login novamente",
        invalid: "Sessão inválida. Faça login novamente"
      }
    },
    common: {
      error: "Erro",
      loading: "Carregando...",
      retry: "Tentar novamente",
      cancel: "Cancelar",
      success: "Sucesso"
    }
  },
  es: {
    auth: {
      login: {
        success: "Inicio de sesión exitoso",
        error: {
          invalidCredentials: "Correo electrónico o contraseña inválidos",
          networkError: "Error de red. Verifique su conexión",
          userNotFound: "Usuario no encontrado",
          accountLocked: "Cuenta bloqueada. Contacte al soporte",
          generic: "Error de inicio de sesión. Inténtelo de nuevo"
        },
        loading: "Iniciando sesión..."
      },
      logout: {
        success: "Sesión cerrada exitosamente",
        error: "Error al cerrar sesión. Inténtelo de nuevo"
      },
      siwe: {
        connectWallet: "Conectar Billetera",
        signMessage: "Firmar Mensaje",
        verifying: "Verificando firma...",
        error: {
          walletNotFound: "No se encontró billetera Ethereum. Instale MetaMask o similar",
          signatureRejected: "Firma rechazada por el usuario",
          networkError: "Error de red durante conexión de billetera",
          generic: "Falló la autenticación de billetera"
        }
      },
      session: {
        expired: "Su sesión ha expirado. Inicie sesión nuevamente",
        invalid: "Sesión inválida. Inicie sesión nuevamente"
      }
    },
    common: {
      error: "Error",
      loading: "Cargando...",
      retry: "Reintentar",
      cancel: "Cancelar",
      success: "Exito"
    }
  }
};

export { translations };
export type { AuthTranslations, CommonTranslations, Language };
