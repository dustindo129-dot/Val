import React from 'react';
import { createUniqueSlug } from '../utils/slugUtils';

const StructuredData = ({ type = 'website', data }) => {
  let structuredData = {};

  switch (type) {
    case 'website':
      structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Valvrareteam",
        "alternateName": ["Light Novel Vietsub", "Light Novel Tiếng Việt"],
        "url": "https://valvrareteam.net",
        "description": "Thư viện Light Novel vietsub lớn nhất Việt Nam. Đọc Light Novel tiếng Việt miễn phí, cập nhật nhanh, dịch chất lượng cao.",
        "inLanguage": "vi-VN",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://valvrareteam.net/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Valvrareteam",
          "url": "https://valvrareteam.net",
          "logo": {
            "@type": "ImageObject",
            "url": "https://valvrareteam.net/images/valvrare-logo.svg"
          }
        },
        "about": [
          {
            "@type": "Thing",
            "name": "Light Novel Vietsub"
          },
          {
            "@type": "Thing", 
            "name": "Light Novel Tiếng Việt"
          },
          {
            "@type": "Thing",
            "name": "Đọc Light Novel Online"
          }
        ]
      };
      break;

    case 'book':
      if (data) {
        const novelSlug = createUniqueSlug(data.title, data._id);
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Book",
          "name": data.title,
          "author": {
            "@type": "Person",
            "name": data.author || "Tác giả không xác định"
          },
          "description": data.description ? data.description.replace(/<[^>]*>/g, '').substring(0, 200) : "",
          "image": data.coverImage,
          "url": `https://valvrareteam.net/truyen/${novelSlug}`,
          "genre": data.genres || ["Light Novel"],
          "inLanguage": "vi-VN",
          "publisher": {
            "@type": "Organization",
            "name": "Valvrareteam"
          },
          "aggregateRating": data.rating ? {
            "@type": "AggregateRating",
            "ratingValue": data.rating,
            "bestRating": "5",
            "worstRating": "1"
          } : undefined
        };
      }
      break;

    case 'article':
      if (data) {
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": data.title,
          "description": data.description,
          "image": data.image,
          "author": {
            "@type": "Person",
            "name": data.author || "Valvrareteam"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Valvrareteam",
            "logo": {
              "@type": "ImageObject",
              "url": "https://valvrareteam.net/images/valvrare-logo.svg"
            }
          },
          "datePublished": data.publishedDate,
          "dateModified": data.modifiedDate,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": data.url
          },
          "inLanguage": "vi-VN"
        };
      }
      break;

    default:
      return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default StructuredData; 