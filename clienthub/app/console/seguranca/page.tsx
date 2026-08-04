import Placeholder from "@/components/console/Placeholder";

export const dynamic = "force-dynamic";

export default function SegurancaPage() {
  return (
    <Placeholder
      title="Segurança"
      description="Configurações de autenticação, 2FA e políticas de acesso."
      dependsOn={[
        "2FA ainda não existe (login hoje é só usuário/senha — cookie HMAC, ver lib/auth.ts)",
        "Já implementado e não depende de nada: senha do cliente com hash bcrypt (lib/password.ts) — esta tela é o lugar natural pra deixar isso visível/documentado pro operador",
        "Política de expiração de sessão hoje é fixa (12h) — vira configurável aqui quando fizer sentido",
      ]}
    />
  );
}
