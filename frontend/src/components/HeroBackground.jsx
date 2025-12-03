const HeroBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      {/* Base Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #DDEAF7 0%, #F9DDE8 50%, #FFFFFF 100%)',
        }}
      />

      {/* Abstract Blob Shapes */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradient definitions */}
          <linearGradient id="blob-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#DDEAF7', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: '#F9DDE8', stopOpacity: 0.4 }} />
          </linearGradient>
          
          <linearGradient id="blob-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#F9DDE8', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0.3 }} />
          </linearGradient>

          <linearGradient id="blob-gradient-3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#DDEAF7', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: '#F9DDE8', stopOpacity: 0.3 }} />
          </linearGradient>

          <linearGradient id="blob-gradient-4" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#F9DDE8', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: '#DDEAF7', stopOpacity: 0.3 }} />
          </linearGradient>

          {/* Blur filters for soft edges */}
          <filter id="blur-soft">
            <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
          </filter>
        </defs>

        {/* Top-left blob */}
        <path
          d="M 0,0 
             C 150,80 250,100 400,120
             C 500,140 580,200 600,300
             C 620,400 580,500 500,550
             C 400,600 300,580 200,500
             C 100,420 50,300 0,200
             Z"
          fill="url(#blob-gradient-1)"
          filter="url(#blur-soft)"
          opacity="0.8"
        />

        {/* Top-right blob */}
        <path
          d="M 1920,0
             C 1770,100 1650,150 1550,200
             C 1450,250 1400,350 1420,450
             C 1440,550 1500,600 1600,580
             C 1700,560 1800,500 1850,400
             C 1900,300 1920,150 1920,0
             Z"
          fill="url(#blob-gradient-2)"
          filter="url(#blur-soft)"
          opacity="0.7"
        />

        {/* Bottom-left blob */}
        <path
          d="M 0,1080
             C 100,1000 200,950 350,920
             C 500,890 600,850 650,750
             C 700,650 650,550 550,500
             C 450,450 300,480 180,580
             C 80,680 20,850 0,1080
             Z"
          fill="url(#blob-gradient-3)"
          filter="url(#blur-soft)"
          opacity="0.6"
        />

        {/* Bottom-right blob */}
        <path
          d="M 1920,1080
             C 1850,980 1750,920 1600,900
             C 1450,880 1350,850 1300,750
             C 1250,650 1300,580 1400,550
             C 1500,520 1650,560 1750,650
             C 1850,740 1900,900 1920,1080
             Z"
          fill="url(#blob-gradient-4)"
          filter="url(#blur-soft)"
          opacity="0.7"
        />

        {/* Additional small accent blobs for depth */}
        <ellipse
          cx="800"
          cy="300"
          rx="200"
          ry="150"
          fill="#DDEAF7"
          opacity="0.3"
          filter="url(#blur-soft)"
        />

        <ellipse
          cx="1400"
          cy="700"
          rx="180"
          ry="180"
          fill="#F9DDE8"
          opacity="0.25"
          filter="url(#blur-soft)"
        />

        <ellipse
          cx="400"
          cy="800"
          rx="150"
          ry="200"
          fill="#FFFFFF"
          opacity="0.4"
          filter="url(#blur-soft)"
        />
      </svg>

      {/* Subtle overlay for text readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(255, 255, 255, 0.3) 100%)',
        }}
      />
    </div>
  );
};

export default HeroBackground;