
const PostEditor = {
  init: () => {
    PostEditor.initPublish();
    PostEditor.initInteractions();
  },

  initPublish: () => {
    const fab = document.querySelector('.fab');
    const dialog = document.getElementById('publish-dialog');
    const confirmBtn = document.getElementById('publish-confirm-btn');
    const cancelBtn = dialog.querySelector('md-text-button[value="cancel"]');

    if (fab && dialog) {
      fab.addEventListener('click', () => {
        // Check login
        if (!window.DB || !window.DB.ctx()) {
          alert('Please login first');
          // For demo, maybe auto-login or redirect?
          // DB.login('20230001', 'password'); // Auto login for convenience in dev
          return;
        }
        dialog.show();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        dialog.close();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const contentField = document.getElementById('post-content');
        const imageField = document.getElementById('post-image-url');
        const tagsField = document.getElementById('post-tags-text');

        const content = contentField.value;
        const imageUrl = imageField.value;
        const tagsStr = tagsField.value;

        if (!content) {
          alert('Please write something');
          return;
        }

        const images = imageUrl ? [imageUrl] : [];
        const tags = tagsStr ? tagsStr.split(' ').filter(t => t.startsWith('#')) : [];

        if (window.DB) {
          window.DB.createPost(content, images, 'public', tags);
        }

        // Reset and close
        contentField.value = '';
        imageField.value = '';
        tagsField.value = '';
        dialog.close();
      });
    }
  },

  initInteractions: () => {
    // Event delegation for Post Cards
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Like Button
      const likeBtn = target.closest('.btn-like');
      if (likeBtn) {
        e.stopPropagation();
        const postId = Number(likeBtn.dataset.id);
        if (window.DB) {
            if (!window.DB.ctx()) { alert('Please login'); return; }
            window.DB.toggleLike(postId);
        }
        return;
      }

      // Comment Button / Open Detail
      const commentBtn = target.closest('.btn-comment');
      const card = target.closest('.post-card');
      
      if (commentBtn) {
          e.stopPropagation();
          const postId = Number(commentBtn.dataset.id);
          PostEditor.openDetail(postId);
          return;
      }

      // If clicked on card but not on buttons, open detail
      if (card && !target.closest('button') && !target.closest('md-icon-button') && !target.closest('md-outlined-button')) {
          const postId = Number(card.dataset.id);
          PostEditor.openDetail(postId);
      }
      
      // Send Comment in Dialog
      const sendCommentBtn = target.closest('#send-comment-btn');
      if (sendCommentBtn) {
          const dialog = document.getElementById('post-detail-dialog');
          const input = document.getElementById('new-comment-input');
          const postId = Number(dialog.dataset.postId);
          
          if (input.value.trim() && window.DB) {
              if (!window.DB.ctx()) { alert('Please login'); return; }
              window.DB.comment(postId, input.value.trim());
              input.value = '';
              // Refresh detail view
              PostEditor.renderComments(postId);
          }
      }
    });
  },

  openDetail: (postId) => {
    const posts = window.DB.getFeed();
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const dialog = document.getElementById('post-detail-dialog');
    if (!dialog) return;

    dialog.dataset.postId = postId;

    // Render Post Content in Dialog
    const container = document.getElementById('detail-post-container');
    container.innerHTML = PostEditor.createCardHTML(post, false); // false = not interactive (no buttons needed if we have specific actions)
    // Actually we might want buttons there too.

    // Render Comments
    PostEditor.renderComments(postId);

    dialog.show();
  },

  renderComments: (postId) => {
    const list = document.getElementById('comments-list');
    const posts = window.DB.getFeed();
    const post = posts.find(p => p.id === postId);
    const escapeHtml = window.Utils ? window.Utils.sanitize : (s) => s;
    
    if (!list || !post) return;

    list.innerHTML = post.comments.map(c => {
        const author = window.DB && window.DB.getUserById ? window.DB.getUserById(c.authorId) : null;
        const authorName = author ? (author.nickname || author.id) : c.authorId;
        const avatarHtml = (author && author.avatar) 
          ? `<img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(authorName)}" style="width:24px; height:24px; border-radius:12px; object-fit:cover; margin-right:8px;">` 
          : `<div class="brand-mark" style="width:24px; height:24px; font-size:12px; margin-right:8px;">${String(author ? author.id : c.authorId).substring(0,2)}</div>`;
        
        return `
            <div class="comment-item" style="background: var(--md-sys-color-surface-container-low); padding: 8px; border-radius: 8px; display:flex; align-items:flex-start;">
                ${avatarHtml}
                <div style="flex:1;">
                    <div style="font-size: 0.8rem; color: var(--md-sys-color-primary); font-weight: bold;">${escapeHtml(authorName)} <span style="font-weight: normal; color: var(--md-sys-color-on-surface-variant);">${window.Utils.timeAgo(c.timestamp)}</span></div>
                    <div style="font-size: 0.9rem;">${escapeHtml(c.content)}</div>
                </div>
            </div>
        `;
    }).join('');
  },

  // Helper to generate HTML (Matches layout.js structure but adds IDs)
  createCardHTML: (post, interactive = true) => {
    const escapeHtml = window.Utils ? window.Utils.sanitize : (s) => s;
    const formatTime = window.Utils ? window.Utils.timeAgo : (s) => s;
    
    const tagsMarkup = (post.tags || [])
        .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
        .join("");
    
    const imagesMarkup = (post.images || []).map(img => `<img src="${img}" style="border-radius: 12px; margin-top: 8px; max-height: 300px; object-fit: cover;">`).join("");

    const user = window.DB ? window.DB.ctx() : null;
    const isLiked = user && post.likes.includes(user.id);
    const likeIcon = isLiked ? 'favorite' : 'favorite_border';
    const likeLabel = isLiked ? 'Liked' : 'Like';

    const author = window.DB && window.DB.getUserById ? window.DB.getUserById(post.authorId) : null;
    const avatarHtml = (author && author.avatar) 
      ? `<img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.nickname || author.id)}" style="width:32px; height:32px; border-radius:12px; object-fit:cover;">` 
      : `<div class="brand-mark" style="width: 32px; height: 32px; font-size: 14px;">${String(author ? author.id : post.authorId).substring(0,2)}</div>`;

    return `
        <div class="post-header">
          ${avatarHtml}
          <div style="flex:1; margin-left: 12px;">
            <div class="post-author md-typescale-title-small">${escapeHtml(author ? (author.nickname || author.id) : post.authorId)}</div>
            <div class="post-meta md-typescale-body-small">${escapeHtml(formatTime(post.timestamp))}</div>
          </div>
        </div>
        <div class="post-content md-typescale-body-medium" style="margin-top: 8px;">
            ${escapeHtml(post.content)}
            ${imagesMarkup}
        </div>
        <div class="post-tags" style="margin-top: 8px;">${tagsMarkup}</div>
        ${interactive ? `
        <div class="post-actions" style="margin-top: 12px;">
          <md-outlined-button class="btn-like" data-id="${post.id}">
            <md-icon slot="icon">${likeIcon}</md-icon>
            ${post.likes.length}
          </md-outlined-button>
          <md-outlined-button class="btn-comment" data-id="${post.id}">
            <md-icon slot="icon">chat_bubble_outline</md-icon>
            ${post.comments.length}
          </md-outlined-button>
        </div>
        ` : ''}
    `;
  }
};

// Auto init when loaded
document.addEventListener('DOMContentLoaded', PostEditor.init);
