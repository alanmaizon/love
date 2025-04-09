import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CountdownTimer({ targetDate }) {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        weeks: Math.floor(difference / (1000 * 60 * 60 * 24 * 7)),
        days: Math.floor((difference / (1000 * 60 * 60 * 24)) % 7),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isCountdownFinished, setIsCountdownFinished] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null);

  const youtubeVideoId = import.meta.env.VITE_YOUTUBE_VIDEO_ID;
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY; // Add your API key to the environment variables

  useEffect(() => {
    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft();
      setTimeLeft(timeLeft);
      if (Object.keys(timeLeft).length === 0) {
        setIsCountdownFinished(true);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    const fetchBroadcastStatus = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/youtube-video-details`,
          {
            params: { videoId: youtubeVideoId },
          }
        );
        const video = response.data.items[0];
        const details = video?.liveStreamingDetails;
    
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
      } catch (error) {
        console.error('Error fetching broadcast status:', error);
        setBroadcastStatus('error');
      }
    };

    fetchBroadcastStatus();
  }, [youtubeVideoId, apiKey]);

  return (
    <div className="countdown-timer">
      {broadcastStatus === 'upcoming' ? (
        <div className="youtube-video">
          <h3>Countdown to the Ceremony</h3>
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
        ) : broadcastStatus === 'ended' ? (
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
        ) : (
          <div>Broadcast status: {broadcastStatus}</div>
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