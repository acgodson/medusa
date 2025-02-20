export default function Footer() {
  return (
    <>
      <footer className="w-full bg-gray-50 py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            {/* Links section - at top on mobile */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center mb-8 md:mb-0">
              <a
                href="https://discord.com"
                className="text-gray-700 hover:text-gray-900 text-xs"
              >
                Discord
              </a>
              <a
                href="https://x.com/Sirenwatch"
                className="text-gray-700 hover:text-gray-900 text-xs"
              >
                Twitter
              </a>
              <a
                href="https://github.com/acgodson/medusa"
                className="text-gray-700 hover:text-gray-900 text-xs"
              >
                GitHub
              </a>
              <a
                href="mailto:hello@sirenwatch.xyz"
                className="text-gray-700 hover:text-gray-900 text-xs"
              >
                hello@sirenwatch.xyz
              </a>
            </div>

            {/* Desktop layout wrapper */}
            <div className="md:flex md:w-full md:justify-between md:items-center md:mt-6">
              {/* Attribution - at bottom on mobile, left on desktop */}
              <div className="text-center md:text-left order-2 md:order-1 mt-8 md:mt-0">
                <p className="text-gray-700 text-xs">
                  Built on{" "}
                  <span className="text-zinc-900 text-xs">BnB Greenfield</span>{" "}
                  and{" "}
                  <span className="text-zinc-900 text-xs">
                    Binance Smart Chain
                  </span>
                </p>
                <p className="text-gray-600 text-xs mt-2">
                  Copyright Siren 2025
                </p>
              </div>

              {/* Spacer for desktop */}
              <div className="hidden md:block md:order-2"></div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
