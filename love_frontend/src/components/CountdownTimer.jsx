import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({});
  const [isCountdownFinished, setIsCountdownFinished] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const youtubeVideoId = import.meta.env.VITE_YOUTUBE_VIDEO_ID;

  // Countdown logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = +new Date(targetDate) - +now;
      if (difference > 0) {
        return {
          weeks: Math.floor(difference / (1000 * 60 * 60 * 24 * 7)),
          days: Math.floor((difference / (1000 * 60 * 60 * 24)) % 7),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return {};
    };

    const interval = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);
      if (Object.keys(time).length === 0) {
        setIsCountdownFinished(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  // Get livestream status from backend
  useEffect(() => {
    const fetchBroadcastStatus = async () => {
      if (!youtubeVideoId) {
        console.error('Missing YouTube video ID');
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/youtube-proxy/`, {
          params: { videoId: youtubeVideoId },
        });

        const details = response.data.items[0]?.liveStreamingDetails;

        if (!details) {
          setBroadcastStatus('unknown');
          return;
        }

        const now = new Date();
        const start = details.actualStartTime ? new Date(details.actualStartTime) : null;
        const end = details.actualEndTime ? new Date(details.actualEndTime) : null;
        const scheduled = details.scheduledStartTime ? new Date(details.scheduledStartTime) : null;

        if (start && !end) {
          setBroadcastStatus('live');
        } else if (end) {
          setBroadcastStatus('ended');
        } else if (scheduled && scheduled > now) {
          setBroadcastStatus('upcoming');
        } else {
          setBroadcastStatus('unknown');
        }
      } catch (err) {
        console.error('Error fetching livestream data:', err);
        setBroadcastStatus('error');
      }
    };

    fetchBroadcastStatus();
  }, [youtubeVideoId]);

  return (
    <div className="countdown-timer">
      {broadcastStatus === 'upcoming' ? (
        <div className="youtube-video">
          <h3>The Ceremony is Coming Soon!</h3>
          <span>
            {timeLeft.weeks}w {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
          <br />
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      ) : isCountdownFinished ? (
        broadcastStatus === 'live' ? (
          <div className="youtube-video">
            <h3>The Ceremony is Live!</h3>
            <iframe
              width="560"
              height="315"
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className="youtube-video">
            <h3>Just Married! Watch the Recording</h3>
            <iframe
              width="560"
              height="315"
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )
      ) : (
        <span>
          {timeLeft.weeks}w {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      )}
    </div>
  );
}

export default CountdownTimer;
