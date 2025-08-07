import { FaPhoneAlt, FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import HandsGif from './HandsGif'; // Adjust the path if needed

function CoupleSection() {
  // ✅ Hardcoded profile data
  const profile = {
    bride_name: 'Anna',
    groom_name: 'Alan',
    location: 'Enniskerry, Ireland',
    bio: "We're looking forward to celebrating with you!",
    profile_picture_url: '/images/couple.jpg', // Place this in your public/images folder
  };

  return (
    <section
      className="couple-section text-center"
      style={{
        backgroundColor: '#a47864',
        position: 'relative',
        padding: '4rem 1rem',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ position: 'relative' }}>
        <h2>Meet the Couple</h2>

        {profile.profile_picture_url && (
          <img
            src={profile.profile_picture_url}
            alt="Couple"
            style={{
              maxWidth: '150px',
              borderRadius: '50%',
              marginBottom: '1rem',
            }}
          />
        )}

        <p>
          <strong>{profile.bride_name} &amp; {profile.groom_name}</strong>
        </p>

        <p>{profile.bio}</p>

        <p>
          You can find us in <strong>{profile.location}</strong>. Feel free to
          contact us, send us a private message.
        </p>

        {/* Social Icons */}
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <a href={`tel:${import.meta.env.VITE_PHONE_NUMBER}`} target="_blank" rel="noopener noreferrer">
            <FaPhoneAlt style={{ fontSize: '2rem', margin: '1rem', color: '#EAD7BB' }} />
          </a>
          <a href={`mailto:${import.meta.env.VITE_EMAIL}`}>
            <FaEnvelope style={{ fontSize: '2rem', margin: '1rem', color: '#EAD7BB' }} />
          </a>
          <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp style={{ fontSize: '2rem', margin: '1rem', color: '#EAD7BB' }} />
          </a>
        </div>
      </div>

      {/* 👐 Animated background */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      >
        <HandsGif />
      </div>
    </section>
  );
}

export default CoupleSection;

