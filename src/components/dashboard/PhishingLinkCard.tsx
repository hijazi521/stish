
"use client";
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react'; // Changed ExternalLink to Copy
import { useToast } from '@/hooks/use-toast'; // Added useToast

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
  const { toast } = useToast();

  const handleCopyLink = async (url: string) => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Link Copied!",
        description: "The phishing link has been copied to your clipboard.",
        variant: "default",
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "Copy Failed",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive",
      });
    }
  };

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
            <Button
              key={link.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleCopyLink(link.url)}
            >
              <Copy className="mr-2 h-4 w-4" /> {/* Changed icon to Copy */}
              {link.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
