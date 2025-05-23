"use client";
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface PhishingLink {
  id: string;
  name: string;
  url: string;
}

interface PhishingLinkCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  links: PhishingLink[];
  cardColorClass?: string; // e.g. bg-blue-100 border-blue-300
}

export function PhishingLinkCard({ title, description, Icon, links, cardColorClass = "bg-card" }: PhishingLinkCardProps) {
  return (
    <Card className={`shadow-lg hover:shadow-xl transition-shadow ${cardColorClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <Icon className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{description}</CardDescription>
        <div className="space-y-2">
          {links.map((link) => (
            <Link href={link.url} key={link.id} target="_blank" rel="noopener noreferrer" passHref legacyBehavior>
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                {link.name}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
