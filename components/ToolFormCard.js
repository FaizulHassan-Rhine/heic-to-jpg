import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { cn } from "@/lib/utils";

/**
 * Consistent card chrome for form / lookup tool sections.
 */
export default function ToolFormCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  headerClassName,
  contentClassName,
}) {
  return (
    <Card className={cn("border border-border shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className={headerClassName}>
          {title && (
            <CardTitle className="flex items-center gap-2 text-foreground">
              {Icon && <Icon className="w-5 h-5 text-primary" aria-hidden />}
              {title}
            </CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("space-y-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
