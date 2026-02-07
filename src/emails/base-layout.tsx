import { Body, Container, Head, Html, Preview, Text, Hr } from "@react-email/components";

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#FAF5EF", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto", padding: "40px 20px" }}>
          {/* Logo / Header */}
          <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#C2410C", marginBottom: "24px" }}>
            Sparebox
          </Text>
          {children}
          <Hr style={{ border: "none", borderTop: "1px solid #E7E5E4", margin: "32px 0" }} />
          <Text style={{ color: "#A8A29E", fontSize: "12px", lineHeight: "1.5" }}>
            Sparebox — Your hardware. Their agents. Everyone wins.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
