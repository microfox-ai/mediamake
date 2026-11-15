import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** The centred card every sign-in page sits in. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mediamake-mark.svg" alt="" className="size-7" />
        MediaMake
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children && <CardContent className="grid gap-4">{children}</CardContent>}
      </Card>
      {footer && <div className="max-w-md text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  return children ? (
    <p role="alert" className="text-sm text-red-600">
      {children}
    </p>
  ) : null;
}

export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
