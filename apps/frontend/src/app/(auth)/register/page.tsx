import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/motion/Reveal';
import { RegisterForm } from '@/modules/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <Reveal>
      <Card className="ring-gradient">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start tracking attendance in a couple of minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </Reveal>
  );
}
