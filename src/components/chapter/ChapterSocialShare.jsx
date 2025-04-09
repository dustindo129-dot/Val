import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF, faTwitter, faPinterestP, faTelegram
} from '@fortawesome/free-brands-svg-icons';

/**
 * ChapterSocialShare Component
 * 
 * Provides buttons to share the chapter on social media platforms
 */
const ChapterSocialShare = ({ handleShare }) => {
  return (
    <div className="share-buttons">
      <a href="#" onClick={(e) => {
        e.preventDefault();
        handleShare('facebook');
      }} className="share-btn facebook" title="Share on Facebook">
        <FontAwesomeIcon icon={faFacebookF}/>
      </a>
      <a href="#" onClick={(e) => {
        e.preventDefault();
        handleShare('twitter');
      }} className="share-btn twitter" title="Share on Twitter">
        <FontAwesomeIcon icon={faTwitter}/>
      </a>
      <a href="#" onClick={(e) => {
        e.preventDefault();
        handleShare('pinterest');
      }} className="share-btn pinterest" title="Share on Pinterest">
        <FontAwesomeIcon icon={faPinterestP}/>
      </a>
      <a href="#" onClick={(e) => {
        e.preventDefault();
        handleShare('telegram');
      }} className="share-btn telegram" title="Share on Telegram">
        <FontAwesomeIcon icon={faTelegram}/>
      </a>
    </div>
  );
};

export default ChapterSocialShare; 