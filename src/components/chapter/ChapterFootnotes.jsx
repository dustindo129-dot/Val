import React from 'react';
import PropTypes from 'prop-types';
import './ChapterFootnotes.css';

const ChapterFootnotes = ({ footnotes, onFootnoteClick }) => {
  if (!footnotes || footnotes.length === 0) return null;

  return (
    <div className="chapter-footnotes">
      <h3 className="footnotes-title">Chú thích</h3>
      <div className="footnotes-list">
        {footnotes.map((footnote) => (
          <div key={footnote.id} className="footnote-item" id={`note-${footnote.id}`}>
            <sup>
              <a 
                href={`#ref-${footnote.id}`}
                className="footnote-backref"
                onClick={(e) => {
                  e.preventDefault();
                  onFootnoteClick(`ref-${footnote.id}`);
                }}
              >
                [{footnote.id}]
              </a>
            </sup>
            <span className="footnote-content">{footnote.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

ChapterFootnotes.propTypes = {
  footnotes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      content: PropTypes.string.isRequired
    })
  ),
  onFootnoteClick: PropTypes.func.isRequired
};

export default ChapterFootnotes; 