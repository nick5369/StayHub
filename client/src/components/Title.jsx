// Title.jsx
import React from "react";

const Title = ({ title, subtitle, align = "center", font = "font-playfair" }) => {
  const alignment =
    align === "left"
      ? "text-left items-start"
      : align === "right"
      ? "text-right items-end"
      : "text-center items-center";

  return (
    <div className={`flex flex-col ${alignment} max-w-3xl mx-auto mb-10`}>
      {/* Title */}
      <h2 className={`${font} text-3xl md:text-4xl font-bold text-gray-900 mb-4`}>
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-gray-600 text-base md:text-lg leading-relaxed font-sans">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default Title;
