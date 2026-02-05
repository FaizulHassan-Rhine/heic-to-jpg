import NextImage from "next/image";

export default function Footer() {
  return (
    <footer className="border-t bg-background mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            © {new Date().getFullYear()}
            <NextImage 
              src="/logo.png" 
              alt="ImageSwitch Logo" 
              width={20} 
              height={20}
              className="h-5 w-5"
            />
            ImageSwitch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

