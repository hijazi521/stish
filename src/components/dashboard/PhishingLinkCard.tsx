
"use client";
import type { LucideIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Save, Trash2 } from 'lucide-react'; // Added Trash2
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
  'google-policy-update': 'googlePolicyUpdateRedirectUrl',
  'discord-terms-update': 'discordTermsUpdateRedirectUrl',
  'instagram-privacy-update': 'instagramPrivacyUpdateRedirectUrl',
  'geo-restricted-service-access': 'geoRestrictedServiceRedirectUrl',
};

export function PhishingLinkCard({ title, description, Icon, links }: PhishingLinkCardProps) {
  const { toast } = useToast();
  const [redirectUrls, setRedirectUrls] = useState<Record<string, string>>({});
  // State to store the initial URLs loaded from localStorage
  const [initialRedirectUrls, setInitialRedirectUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadedRedirectUrls: Record<string, string> = {};
    const loadedInitialRedirectUrls: Record<string, string> = {};

    links.forEach(link => {
      if (REDIRECT_URL_KEYS[link.id]) {
        const savedUrl = localStorage.getItem(REDIRECT_URL_KEYS[link.id]);
        const urlValue = savedUrl || '';
        loadedRedirectUrls[link.id] = urlValue;
        loadedInitialRedirectUrls[link.id] = urlValue;
      }
    });
    setRedirectUrls(loadedRedirectUrls);
    setInitialRedirectUrls(loadedInitialRedirectUrls);
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

  const handleSaveOrDeleteRedirectUrl = (linkId: string) => {
    const currentUrl = redirectUrls[linkId] || '';
    const initialUrl = initialRedirectUrls[linkId] || ''; // Get initial URL for this linkId
    const storageKey = REDIRECT_URL_KEYS[linkId];
    const linkName = links.find(l => l.id === linkId)?.name || "This template";

    if (!storageKey) return;

    const isDeleteMode = currentUrl !== '' && currentUrl === initialUrl;

    if (isDeleteMode) {
      localStorage.removeItem(storageKey);
      setRedirectUrls(prev => ({ ...prev, [linkId]: '' }));
      setInitialRedirectUrls(prev => ({ ...prev, [linkId]: '' })); // Reflect deletion in initial state
      toast({
        title: "Redirection URL Deleted",
        description: `Redirection has been disabled for ${linkName}.`,
      });
    } else { // Save action
      localStorage.setItem(storageKey, currentUrl);
      setInitialRedirectUrls(prev => ({ ...prev, [linkId]: currentUrl })); // Update initial to current after save
      toast({
        title: "Redirection URL Saved",
        description: currentUrl
          ? `${linkName} will redirect to: ${currentUrl}`
          : `Redirection disabled for ${linkName}.`,
      });
    }
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
              {REDIRECT_URL_KEYS[link.id] && (() => {
                const currentVal = redirectUrls[link.id] || '';
                const initialVal = initialRedirectUrls[link.id] || '';

                const isDeleteMode = currentVal !== '' && currentVal === initialVal;
                // Save mode if current is different from initial, OR if current is empty (intending to save an empty state)
                // This also means if initial was empty and current is now also empty, it's a "Save" of empty.
                const isSaveMode = currentVal !== initialVal;

                let buttonIcon = <Save className="h-4 w-4" />;
                let buttonVariant: "default" | "destructive" | "outline" = "outline";
                let buttonActionLabel = `Save redirection URL for ${link.name}`;

                if (isDeleteMode) {
                  buttonIcon = <Trash2 className="h-4 w-4" />;
                  buttonVariant = "destructive";
                  buttonActionLabel = `Delete redirection URL for ${link.name}`;
                } else if (isSaveMode) {
                  buttonVariant = "default";
                }
                // If !isDeleteMode && !isSaveMode, it means currentVal === initialVal AND currentVal is empty.
                // In this case, it's an empty field that was already empty. Button should be 'outline' 'Save'.

                return (
                  <div className="mt-2 pl-3 border-l-2 border-border/60 ml-1 py-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={buttonVariant}
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 p-0"
                        onClick={() => handleSaveOrDeleteRedirectUrl(link.id)}
                        aria-label={buttonActionLabel}
                      >
                        {buttonIcon}
                      </Button>
                      <Input
                        type="url"
                        placeholder="Enter redirection URL"
                        className="h-8 text-sm text-center flex-grow"
                        value={currentVal}
                        onChange={(e) => handleRedirectUrlChange(link.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
