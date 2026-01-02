import Image from "next/image";

export default function HandprintPattern() {
  const handprints = [
    { image: "/handprint1.png", filter: "hue-rotate(0deg) saturate(150%)", rotation: 15, x: "5%", y: "10%", size: 80 },
    { image: "/handprint2.png", filter: "hue-rotate(320deg) saturate(120%)", rotation: -20, x: "15%", y: "70%", size: 70 },
    { image: "/handprint1.png", filter: "hue-rotate(45deg) saturate(180%)", rotation: 45, x: "85%", y: "20%", size: 90 },
    { image: "/handprint2.png", filter: "hue-rotate(150deg) saturate(100%)", rotation: -30, x: "92%", y: "75%", size: 60 },
    { image: "/handprint1.png", filter: "hue-rotate(60deg) saturate(200%)", rotation: 25, x: "40%", y: "5%", size: 75 },
    { image: "/handprint2.png", filter: "hue-rotate(120deg) saturate(130%)", rotation: -15, x: "60%", y: "85%", size: 70 },
    { image: "/handprint1.png", filter: "hue-rotate(180deg) saturate(110%)", rotation: 35, x: "25%", y: "40%", size: 65 },
    { image: "/handprint2.png", filter: "hue-rotate(30deg) saturate(140%)", rotation: -40, x: "75%", y: "50%", size: 80 },
    { image: "/handprint1.png", filter: "hue-rotate(270deg) saturate(160%)", rotation: 10, x: "50%", y: "15%", size: 55 },
    { image: "/handprint2.png", filter: "hue-rotate(200deg) saturate(120%)", rotation: -25, x: "10%", y: "45%", size: 68 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
      {handprints.map((handprint, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: handprint.x,
            top: handprint.y,
            transform: `rotate(${handprint.rotation}deg)`,
            filter: handprint.filter,
          }}
        >
          <Image
            src={handprint.image}
            alt=""
            width={handprint.size}
            height={handprint.size}
            className="w-auto h-auto"
          />
        </div>
      ))}
    </div>
  );
}
