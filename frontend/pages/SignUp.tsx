import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { SignUpForm } from "@/components/signup-form";

export default function SignUp() {
  const { t } = useI18n();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      toast.promise(signUp(credentials), {
        loading: "Creating account...",
        success: t("common.success"),
        error: "Failed to create account",
      });
    } catch (error) {
      console.error("SignUp error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignUpForm
          credentials={credentials}
          setCredentials={setCredentials}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
