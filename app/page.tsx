import AuthButton from "@/components/AuthButton";
import ChecklistApp from "@/components/ChecklistApp";

export default function Home() {
  return (
    <>
      <header>
        <div className="header-top">
          <h1>持ち物チェック</h1>
          <AuthButton />
        </div>
        <p>外出前の準備・持ち物確認</p>
      </header>

      <ChecklistApp />

      <footer>データはクラウドまたはブラウザに自動保存されます</footer>
    </>
  );
}
