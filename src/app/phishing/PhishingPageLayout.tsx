import React from 'react';

interface PhishingPageLayoutProps {
  children: React.ReactNode;
  title: string; // Added title prop for setting document title
  className?: string;
  style?: React.CSSProperties;
}

const PhishingPageLayout: React.FC<PhishingPageLayoutProps> = ({
  children,
  title,
  className,
  style,
}) => {
  React.useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div
      className={`min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 ${className || ''}`}
      style={style}
    >
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        {children}
      </div>
    </div>
  );
};

export default PhishingPageLayout;
