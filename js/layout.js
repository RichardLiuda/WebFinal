(() => {
  const state = {
    filter: "all",
    route: "home",
  };

  const tabs = document.getElementById("feed-tabs");
  const tabButtons = Array.from(document.querySelectorAll("#feed-tabs md-primary-tab"));
  const navButtons = Array.from(document.querySelectorAll("[data-route]"));

  const panelMap = {
    all: {
      panel: document.getElementById("panel-all"),
      list: document.getElementById("feed-list-all"),
      empty: document.getElementById("feed-empty-all"),
    },
    following: {
      panel: document.getElementById("panel-following"),
      list: document.getElementById("feed-list-following"),
      empty: document.getElementById("feed-empty-following"),
    },
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatTime = (isoString) => {
    if (window.Utils && typeof window.Utils.timeAgo === "function") {
      return window.Utils.timeAgo(isoString);
    }
    const time = new Date(isoString);
    if (Number.isNaN(time.getTime())) {
      return "just now";
    }
    return time.toLocaleString();
  };

  const mockFeed = () => {
    return [
      {
        id: Date.now(),
        authorId: "20230001",
        content: "Welcome to CampusLink. Share your campus moment.",
        images: [],
        tags: ["#campus", "#daily"],
        likes: ["20230002"],
        comments: [],
        timestamp: new Date().toISOString(),
      },
    ];
  };

  const getFeedData = (filter) => {
    if (window.DB && typeof window.DB.getFeed === "function") {
      const mapped = filter === "following" ? "following" : "all";
      const data = window.DB.getFeed(mapped);
      return Array.isArray(data) ? data : [];
    }
    return mockFeed();
  };

  const normalizePost = (post) => {
    return {
      id: post.id,
      authorId: post.authorId || "unknown",
      content: post.content || "",
      tags: Array.isArray(post.tags) ? post.tags : [],
      images: Array.isArray(post.images) ? post.images : [],
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments : [],
      timestamp: post.timestamp || new Date().toISOString(),
    };
  };

  const getActivePanel = () => {
    return panelMap[state.filter] || panelMap.all;
  };

  const renderFeed = () => {
    const panel = getActivePanel();
    const posts = getFeedData(state.filter).map(normalizePost);

    panel.list.innerHTML = "";

    if (!posts.length) {
      panel.empty.hidden = false;
      return;
    }

    panel.empty.hidden = true;

    const fragment = document.createDocumentFragment();
    posts.forEach((post, index) => {
      const card = document.createElement("article");
      card.className = "post-card";
      card.dataset.id = post.id;
      card.style.animationDelay = `${index * 0.05}s`;

      const tagsMarkup = post.tags
        .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
        .join("");

      const imagesMarkup = (post.images || []).map(img => `<img src="${img}" style="border-radius: 12px; margin-top: 8px; max-height: 300px; object-fit: cover;">`).join("");
      
      const user = window.DB ? window.DB.ctx() : null;
      const isLiked = user && post.likes.includes(user.id);
      const likeIcon = isLiked ? 'favorite' : 'favorite_border';

      const author = window.DB && window.DB.getUserById ? window.DB.getUserById(post.authorId) : null;
      const avatarHtml = (author && author.avatar) 
        ? `<img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.nickname || author.id)}" style="width:32px; height:32px; border-radius:12px; object-fit:cover;">` 
        : `<div class="brand-mark" style="width: 32px; height: 32px; font-size: 14px;">${String(author ? author.id : post.authorId).substring(0,2)}</div>`;

      // Check if user is logged in and not the author
      const isCurrentUser = user && String(user.id) === String(post.authorId);
      const isFollowing = user && !isCurrentUser && window.DB.isFollowing ? window.DB.isFollowing(post.authorId) : false;
      const followBtnHtml = user && !isCurrentUser ? `
        <md-outlined-button type="button" class="btn-follow" data-author-id="${post.authorId}">
          ${isFollowing ? 'Unfollow' : 'Follow'}
        </md-outlined-button>
      ` : '';

      card.innerHTML = `
        <div class="post-header">
          ${avatarHtml}
          <div style="flex:1; margin-left: 12px;">
            <div class="post-author md-typescale-title-small">${escapeHtml(
            author ? (author.nickname || author.id) : post.authorId
          )}</div>
            <div class="post-meta md-typescale-body-small">${escapeHtml(
            formatTime(post.timestamp)
          )} ${author ? `• ${author.stats?.followers || 0} followers` : ''}</div>
          </div>
          ${followBtnHtml}
        </div>
        <div class="post-content md-typescale-body-medium" style="margin-top: 8px;">${escapeHtml(
          post.content
        )}
        ${imagesMarkup}
        </div>
        <div class="post-tags" style="margin-top: 8px;">${tagsMarkup}</div>
        <div class="post-actions" style="margin-top: 12px;">
          <md-outlined-button type="button" class="btn-like" data-id="${post.id}">
            <md-icon slot="icon">${likeIcon}</md-icon>
            ${post.likes.length}
          </md-outlined-button>
          <md-outlined-button type="button" class="btn-comment" data-id="${post.id}">
            <md-icon slot="icon">chat_bubble_outline</md-icon>
            ${post.comments.length}
          </md-outlined-button>
          <md-text-button type="button">Share</md-text-button>
        </div>
      `;
      fragment.appendChild(card);
    });

    panel.list.appendChild(fragment);

    // Add event listeners for follow buttons
    panel.list.querySelectorAll('.btn-follow').forEach(button => {
      button.addEventListener('click', () => {
        const authorId = button.dataset.authorId;
        if (window.DB && window.DB.toggleFollow) {
          const isFollowing = window.DB.toggleFollow(authorId);
          button.textContent = isFollowing ? 'Unfollow' : 'Follow';
        }
      });
    });
  };

  const setActiveFilter = (filter) => {
    state.filter = filter;
    const index = filter === "following" ? 1 : 0;

    if (tabs && "activeTabIndex" in tabs) {
      tabs.activeTabIndex = index;
    }

    tabButtons.forEach((tab, tabIndex) => {
      tab.toggleAttribute("active", tabIndex === index);
    });

    Object.entries(panelMap).forEach(([key, panel]) => {
      panel.panel.hidden = key !== filter;
    });

    renderFeed();
  };

  const setActiveRoute = (route) => {
    state.route = route;
    navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.route === route);
    });
  };

  if (tabs) {
    tabs.addEventListener("change", () => {
      const index = typeof tabs.activeTabIndex === "number" ? tabs.activeTabIndex : 0;
      const nextFilter = tabButtons[index]?.dataset.filter || "all";
      setActiveFilter(nextFilter);
    });
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      setActiveRoute(route);

      if (route === "profile") {
        const currentUser = window.DB?.getCurrentUser();
        if (currentUser) {
          window.location.href = "profile.html";
        } else {
          window.location.href = "auth.html";
        }
      }
    });
  });

  if (window.DB && typeof window.DB.on === "function") {
    window.DB.on("db:update", () => renderFeed());
  }

  setActiveFilter(state.filter);
  setActiveRoute(state.route);

  if (window.customElements && customElements.whenDefined) {
    customElements.whenDefined("md-tabs").then(() => {
      setActiveFilter(state.filter);
    });
  }
})();
