import React, { useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import config from '../../config/config';

const ChapterContent = ({
  chapter,
  isEditing,
  editedContent,
  setEditedContent,
  fontSize,
  fontFamily,
  lineHeight,
  editorRef,
  getSafeHtml
}) => {
  const contentRef = useRef(null);

  return (
    <div className="chapter-card">
      <h2 className="chapter-title-banner">{chapter.title}</h2>

      {isEditing ? (
        <div className="chapter-content editor-container">
          <Editor
            apiKey={config.tinymceApiKey}
            onInit={(evt, editor) => {
              editorRef.current = editor;
              // Set raw HTML content directly
              if (chapter?.content) {
                editor.setContent(chapter.content, {format: 'raw'});
              }
            }}
            value={editedContent}
            onEditorChange={(content) => {
              setEditedContent(content);
            }}
            init={{
              height: 500,
              menubar: false,
              entity_encoding: 'raw',
              encoding: 'html',
              convert_urls: false,
              verify_html: false,
              cleanup: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount',
                'preview'
              ],
              toolbar: 'undo redo | formatselect | ' +
                'bold italic underline strikethrough | ' +
                'alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | ' +
                'link image | code preview | wordcount | removeformat | help',
              content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
              skin: 'oxide',
              content_css: 'default',
              statusbar: true,
              resize: false,
              branding: false,
              promotion: false,
              paste_data_images: true,
              smart_paste: true,
              paste_as_text: false,
              wordcount_countcharacters: true,
              wordcount_countwords: true,
              wordcount_countspaces: false,
              wordcount_alwaysshown: true,
              images_upload_handler: (blobInfo) => {
                return new Promise((resolve, reject) => {
                  const formData = new FormData();
                  formData.append('file', blobInfo.blob(), blobInfo.filename());
                  formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);
                  formData.append('folder', 'novel-illustrations');

                  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`;

                  fetch(cloudinaryUrl, {
                    method: 'POST',
                    body: formData
                  })
                  .then(response => response.json())
                  .then(result => {
                    if (result.secure_url) {
                      resolve(result.secure_url);
                    } else {
                      reject('Image upload failed');
                    }
                  })
                  .catch(error => {
                    console.error('Cloudinary upload error:', error);
                    reject('Image upload failed');
                  });
                });
              },
              images_upload_base_path: '/',
              automatic_uploads: true
            }}
          />
        </div>
      ) : (
        <div
          ref={contentRef}
          className="chapter-content"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: fontFamily,
            lineHeight: lineHeight,
            padding: '15px 10px'
          }}
          dangerouslySetInnerHTML={getSafeHtml(chapter.content)}
        />
      )}
    </div>
  );
};

export default ChapterContent; 