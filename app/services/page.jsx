import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./services.module.css";

export const metadata = {
  title: "Cab Services & Operational Fleet | CabGo India",
  description: "Explore supported CabGo services: point-to-point city cabs, vehicle tiers, live GPS mapping, and driver console.",
};

export default function ServicesPage() {
  const supportedServices = [
    {
      icon: "🗺️",
      title: "Interactive Point-to-Point Booking",
      desc: "Live route mapping with reverse-geocoded landmarks, GPS location detection, and automatic polyline bounds.",
      features: [
        "Streets, Satellite & Hybrid views",
        "Auto-fill addresses via Nominatim",
        "Nashik & Maharashtra regional landmarks",
      ],
      link: "/booking",
      actionText: "Try Booking Map",
    },
    {
      icon: "📊",
      title: "Transparent Real-Time Fare Engine",
      desc: "Haversine geodesic distance calculation guaranteeing zero surge surprises before you confirm.",
      features: [
        "Base ₹40 + ₹15 per kilometer",
        "Dynamic ride tier multipliers",
        "Minimum transparent fare of ₹60",
      ],
      link: "/booking",
      actionText: "Calculate Fare",
    },
    {
      icon: "💳",
      title: "Verified Razorpay Digital Payments",
      desc: "Instant server-side payment order generation and cryptographic HMAC verification for all major Indian payment methods.",
      features: [
        "UPI (Google Pay, PhonePe, Paytm)",
        "Credit / Debit cards & Netbanking",
        "Idempotent duplicate charge protection",
      ],
      link: "/dashboard",
      actionText: "View Payment Flow",
    },
    {
      icon: "🚦",
      title: "Driver Dispatch & Ride Progression",
      desc: "Dedicated driver portal allowing real-time discovery of nearby ride requests and structured trip statuses.",
      features: [
        "Accepted → Arriving → In Progress → Completed",
        "Address & fare visibility upfront",
        "Conflict-free atomic driver claiming",
      ],
      link: "/driver",
      actionText: "Open Driver Console",
    },
    {
      icon: "📜",
      title: "Passenger Trip History & Receipts",
      desc: "Centralized archive of all past and active journeys with live status badges and direct payment links.",
      features: [
        "Accurate timestamps & addresses",
        "Status tracking for active journeys",
        "One-click repeat booking flow",
      ],
      link: "/my-rides",
      actionText: "View My Rides",
    },
    {
      icon: "🛡️",
      title: "Secure Role-Based Authentication",
      desc: "JWT-based session authentication with bcrypt password hashing and dedicated passenger and driver profiles.",
      features: [
        "Separate Passenger & Driver accounts",
        "Session persistence with fast 1-click demos",
        "Rate-limited security guards",
      ],
      link: "/login",
      actionText: "Access Account",
    },
  ];

  const fleet = [
    {
      name: "Hatchback",
      model: "Maruti Suzuki Swift / WagonR",
      rate: "₹10 /km",
      img: "/images/cars/hatchback.jpg",
    },
    {
      name: "Sedan",
      model: "Maruti Suzuki Dzire / Etios",
      rate: "₹12 /km",
      img: "/images/cars/sedan.jpg",
    },
    {
      name: "Spacious SUV",
      model: "Toyota Innova Crysta / Ertiga",
      rate: "₹18 /km",
      img: "/images/cars/suv.jpg",
    },
    {
      name: "Luxury Chauffeur",
      model: "Mercedes-Benz E-Class / BMW 5",
      rate: "₹25 /km",
      img: "/images/cars/luxury.jpg",
    },
  ];

  return (
    <div className={styles.page}>
      <Navbar />

      <PageHeader
        eyebrow="SUPPORTED MOBILITY SERVICES"
        title="Comprehensive Transit Services"
        titleAccent="Across India"
        subtitle="Explore all verified features supported by our backend API, including live map dispatch, real-time fare estimation, and driver console."
      />

      <main className={styles.main}>
        {/* Supported Services Grid */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Operational Platform Features</h2>
            <p>Every feature listed below is fully wired to our live PostgreSQL API.</p>
          </div>

          <div className={styles.servicesGrid}>
            {supportedServices.map((service, idx) => (
              <div key={idx} className={styles.serviceCard}>
                <div className={styles.iconBox}>{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.desc}</p>
                <ul className={styles.featureList}>
                  {service.features.map((feat, fIdx) => (
                    <li key={fIdx}>
                      <span style={{ color: "#f4c401" }}>✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href={service.link} className={styles.cardAction}>
                  {service.actionText} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Fleet Showcase */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Available Vehicle Categories</h2>
            <p>Select your preferred ride tier during booking with accurate capacity and pricing.</p>
          </div>

          <div className={styles.fleetGrid}>
            {fleet.map((car, idx) => (
              <div key={idx} className={styles.fleetCard}>
                <div className={styles.fleetImgWrap}>
                  <img src={car.img} alt={car.name} className={styles.fleetImg} />
                </div>
                <div className={styles.fleetContent}>
                  <h4>{car.name}</h4>
                  <div className={styles.fleetModel}>{car.model}</div>
                  <div className={styles.fleetRate}>{car.rate}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
