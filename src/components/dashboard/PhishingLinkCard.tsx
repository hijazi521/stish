
"use client";
import type { LucideIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  // cardColorClass?: string; // Removed prop
}

const REDIRECT_URL_KEYS: Record<string, string> = {
  'content-unlock': 'contentUnlockRedirectUrl',
  'restricted-website-access': 'restrictedWebsiteRedirectUrl',
};

export function PhishingLinkCard({ title, description, Icon, links }: PhishingLinkCardProps) {
  const { toast } = useToast();
  // Use an object to store redirect URLs for multiple links if needed
  const [redirectUrls, setRedirectUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const initialRedirectUrls: Record<string, string> = {};
    links.forEach(link => {
      if (REDIRECT_URL_KEYS[link.id]) {
        const savedUrl = localStorage.getItem(REDIRECT_URL_KEYS[link.id]);
        if (savedUrl) {
          initialRedirectUrls[link.id] = savedUrl;
        } else {
          initialRedirectUrls[link.id] = ''; // Ensure key exists
        }
      }
    });
    setRedirectUrls(initialRedirectUrls);
  }, [links]);

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

  const handleSaveRedirectUrl = (linkId: string) => {
    const urlToSave = redirectUrls[linkId] || '';
    const storageKey = REDIRECT_URL_KEYS[linkId];
    if (!storageKey) return;

    localStorage.setItem(storageKey, urlToSave);

    // Dynamically create the toast message based on the link name
    const linkName = links.find(l => l.id === linkId)?.name || "This template";

    toast({
      title: "Redirection URL Saved",
      description: urlToSave
        ? `${linkName} will redirect to: ${urlToSave}`
        : `Redirection disabled for ${linkName}.`,
    });
  };

  const handleRedirectUrlChange = (linkId: string, value: string) => {
    setRedirectUrls(prev => ({ ...prev, [linkId]: value }));
  };

  return (
    <Card className={`shadow-lg hover:shadow-xl transition-shadow w-full max-w-md`}> {/* Added w-full and max-w-md */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <Icon className="h-6 w-6 text-primary" /> {/* Changed icon color */}
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{description}</CardDescription>
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id}>
              <Button
                variant="outline"
                className="w-full justify-start text-left whitespace-normal h-auto py-2" // Added text-left, whitespace-normal, h-auto, py-2 for better text wrapping
                onClick={() => handleCopyLink(link.url)}
              >
                <Copy className="mr-2 h-4 w-4 flex-shrink-0" /> {/* Added flex-shrink-0 to prevent icon from shrinking */}
                <span className="flex-grow">{link.name}</span> {/* Wrapped name in span for flex control */}
              </Button>
              {REDIRECT_URL_KEYS[link.id] && (
                <div className="mt-2 pl-3 border-l-2 border-border/60 ml-1 py-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={(redirectUrls[link.id] || '') ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 p-0"
                      onClick={() => handleSaveRedirectUrl(link.id)}
                      aria-label={`Save redirection URL for ${link.name}`}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Input
                      type="url"
                      placeholder="Enter redirection URL"
                      className="h-8 text-sm text-center flex-grow"
                      value={redirectUrls[link.id] || ''}
                      onChange={(e) => handleRedirectUrlChange(link.id, e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
