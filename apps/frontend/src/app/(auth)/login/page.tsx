import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/motion/Reveal';
import { LoginForm } from '@/modules/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <Reveal>
      <Card className="ring-gradient">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back to StudentOS AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </Reveal>
  );
}
