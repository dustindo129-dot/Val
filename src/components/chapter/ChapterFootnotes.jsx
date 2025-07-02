import React from 'react';
import PropTypes from 'prop-types';
import './ChapterFootnotes.css';

const ChapterFootnotes = ({ footnotes, onFootnoteClick }) => {
    if (!footnotes || footnotes.length === 0) return null;

    // Function to process footnote content - enable hyperlinks and preserve line breaks
    const processFootnoteContent = (content) => {
        if (!content) return '';

        let processedContent = content;

        // Convert line breaks to <br> tags
        processedContent = processedContent.replace(/\n/g, '<br>');

        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
        processedContent = processedContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        // Convert www links to clickable links
        const wwwRegex = /(^|[^\/])(www\.[^\s<>"]+)/gi;
        processedContent = processedContent.replace(wwwRegex, '$1<a href="http://$2" target="_blank" rel="noopener noreferrer">$2</a>');

        // Convert email addresses to mailto links
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
        processedContent = processedContent.replace(emailRegex, '<a href="mailto:$1">$1</a>');

        // Support basic markdown-style formatting
        // Bold text **text** or __text__
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedContent = processedContent.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Italic text *text* or _text_
        processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        processedContent = processedContent.replace(/_(.*?)_/g, '<em>$1</em>');

        return processedContent;
    };

    return (
        <div className="chapter-footnotes">
            <h3 className="footnotes-title">Chú thích</h3>
            <div className="footnotes-list">
                {footnotes.map((footnote) => {
                    // Always show simple [X] format in viewer, handle valnote conversion properly
                    let footnoteName = footnote.name || footnote.id.toString();
                    let displayName = footnoteName;

                    // Always show just the number part, regardless of internal format
                    const numberMatch = footnoteName.match(/\d+/);
                    if (numberMatch) {
                        displayName = numberMatch[0]; // Just the number: "1", "2", etc.
                    }

                    // Use original footnote name for anchor links to maintain compatibility
                    const anchorName = footnote.name || footnote.id.toString();

                    return (
                        <div key={footnote.id} className="footnote-item" id={`note-${anchorName}`}>
                            <sup>
                                <a
                                    href={`#ref-${anchorName}`}
                                    className="footnote-backref"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onFootnoteClick(`ref-${anchorName}`);
                                    }}
                                >
                                    [{displayName}]
                                </a>
                            </sup>
                            <span
                                className="footnote-content"
                                dangerouslySetInnerHTML={{ __html: processFootnoteContent(footnote.content) }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

ChapterFootnotes.propTypes = {
    footnotes: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            name: PropTypes.string,
            content: PropTypes.string.isRequired
        })
    ),
    onFootnoteClick: PropTypes.func.isRequired
};

export default ChapterFootnotes;