import * as React from "react";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Componente item individual de breadcrumb que não usa React.Fragment diretamente
 */
function BreadcrumbItemWithSeparator({ 
  item, 
  isLast 
}: { 
  item: BreadcrumbItem; 
  isLast: boolean;
}) {
  // Cada item individual que não usa Fragment diretamente
  return (
    <>
      <BreadcrumbItem>
        {isLast ? (
          <BreadcrumbPage>{item.label}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link href={item.href || "#"}>{item.label}</Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {!isLast && <BreadcrumbSeparator />}
    </>
  );
}

/**
 * Componente separado para renderizar os itens de breadcrumb,
 * evitando completamente problemas com React.Fragment
 */
function BreadcrumbItems({ items }: { items: BreadcrumbItem[] }) {
  // Este componente agora renderiza uma lista de componentes individuais
  return (
    <>
      {items.map((item, index) => (
        <BreadcrumbItemWithSeparator 
          key={item.label} 
          item={item}
          isLast={index === items.length - 1}
        />
      ))}
    </>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)} {...rest}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            
            {/* Componente isolado para evitar propagação de props para o React.Fragment */}
            <BreadcrumbItems items={breadcrumbs} />
          </BreadcrumbList>
        </Breadcrumb>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}