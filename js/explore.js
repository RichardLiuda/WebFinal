(() => {
  const state = {
    filter: "trending",
    route: "explore",
    trends: [
      { id: 1, tag: "#campuslife", description: "Campus daily life", posts: 128 },
      { id: 2, tag: "#techclub", description: "Technology club activities", posts: 89 },
      { id: 3, tag: "#examweek", description: "Exam preparation tips", posts: 203 },
      { id: 4, tag: "#sports", description: "Campus sports events", posts: 156 },
      { id: 5, tag: "#foodie", description: "Campus food recommendations", posts: 92 },
      { id: 6, tag: "#studyabroad", description: "Study abroad experiences", posts: 67 },
      { id: 7, tag: "#volunteer", description: "Volunteer opportunities", posts: 142 },
      { id: 8, tag: "#music", description: "Campus music scene", posts: 78 },
    ],
    selectedTrend: null,
    searchQuery: "",
    selectedNavigation: "trending", // 添加当前选中的导航项
    selectedFilter: null, // 添加当前选中的筛选器
  };

  const tabs = document.getElementById("feed-tabs");
  const tabButtons = Array.from(document.querySelectorAll("#feed-tabs md-primary-tab"));
  const navButtons = Array.from(document.querySelectorAll("[data-route]"));

  const panelMap = {
    trending: {
      panel: document.getElementById("panel-trending"),
      list: document.getElementById("feed-list-trending"),
      empty: document.getElementById("feed-empty-trending"),
    },
    users: {
      panel: document.getElementById("panel-users"),
      list: document.getElementById("feed-list-users"),
      empty: document.getElementById("feed-empty-users"),
    },
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
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

  // Generate mock posts for each trend
  const generateMockPosts = () => {
    const mockUsers = [
      { id: "20230001", nickname: "Alex Chen", avatar: `https://picsum.photos/id/1005/200/200` },
      { id: "20230002", nickname: "Emma Wilson", avatar: `https://picsum.photos/id/1000/200/200` },
      { id: "20230003", nickname: "Ryan Lee", avatar: `https://picsum.photos/id/1012/200/200` },
      { id: "20230004", nickname: "Sophia Wang", avatar: `https://picsum.photos/id/1027/200/200` },
      { id: "20230005", nickname: "David Kim", avatar: `https://picsum.photos/id/1025/200/200` },
    ];

    const contentTemplates = {
      "#campuslife": [
        "Just had an amazing day on campus! The weather was perfect for a picnic.",
        "Library study session with friends. Coffee and textbooks all day long.",
        "The cherry blossoms are blooming! Campus looks beautiful right now.",
        "Late night pizza run with roommates. College life at its finest.",
        "Attended a great lecture today. Learned so many new things!"
      ],
      "#techclub": [
        "Hackathon this weekend! Can't wait to code all night.",
        "Learned about AI today at the tech club meeting. Fascinating stuff!",
        "Worked on our project prototype. Making good progress.",
        "Guest speaker from Google today. Got some great career advice.",
        "Code review session. Always learning from each other."
      ],
      "#examweek": [
        "Final exam week starts tomorrow. Wish me luck!",
        "Study tips: Pomodoro technique really works for me.",
        "Pulled an all-nighter studying. Coffee is my best friend right now.",
        "Group study session in the library. We're all in this together.",
        "Exam prep playlist on repeat. Music helps me focus."
      ],
      "#sports": [
        "Basketball game tonight! Let's go team!",
        "Won the intramural soccer tournament. So excited!",
        "Morning jog around campus. Great way to start the day.",
        "Volleyball practice was intense but fun.",
        "Attended the football game. Atmosphere was electric!"
      ],
      "#foodie": [
        "New café opened on campus. Their latte art is amazing!",
        "Tried the new food truck. Best tacos I've ever had!",
        "Dorm cooking hack: Instant noodles with an egg. Delicious!",
        "Campus dining hall secret menu item. You have to try it!",
        "Late night snack run to the convenience store."
      ],
      "#studyabroad": [
        "Just got accepted to study abroad in Paris! So excited.",
        "Study abroad tips: Pack light but bring adapter plugs.",
        "Missing home but loving my time in Tokyo.",
        "Met so many amazing people from around the world.",
        "Study abroad is the best decision I've ever made."
      ],
      "#volunteer": [
        "Volunteered at the local animal shelter today. So rewarding.",
        "Food drive volunteer opportunity this weekend. Sign up now!",
        "Helped clean up the campus garden. Great way to give back.",
        "Volunteer teaching at the community center. Love making a difference.",
        "Blood drive on campus next week. Donate if you can!"
      ],
      "#music": [
        "Campus band performance tonight. Don't miss it!",
        "Open mic night at the café. Such talented people.",
        "Started learning to play the guitar. It's challenging but fun.",
        "Music festival on campus next month. Can't wait!",
        "My roommate and I started a band. First practice tonight!"
      ]
    };

    const posts = [];
    let postId = Date.now();

    // For each trend, generate some mock posts
    state.trends.forEach(trend => {
      const postCount = Math.floor(Math.random() * 5) + 3; // 3-7 posts per trend
      
      for (let i = 0; i < postCount; i++) {
        const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const contentIndex = Math.floor(Math.random() * contentTemplates[trend.tag].length);
        const hasImage = Math.random() > 0.3; // 70% chance of having an image
        
        posts.push({
          id: postId++,
          authorId: user.id,
          content: contentTemplates[trend.tag][contentIndex],
          images: hasImage ? [`https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/600/400`] : [],
          tags: [trend.tag, `#${trend.tag.slice(1)}${Math.random() > 0.5 ? "2024" : "life"}`],
          likes: Array(Math.floor(Math.random() * 50) + 5).fill("").map((_, i) => `user${i}`), // 5-55 likes
          comments: Array(Math.floor(Math.random() * 20)).fill("").map((_, i) => ({ // 0-20 comments
            id: `comment${postId}${i}`,
            authorId: mockUsers[Math.floor(Math.random() * mockUsers.length)].id,
            content: `Great post! ${Math.random() > 0.5 ? "👍" : "I agree!"}`,
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString() // random time in last 24 hours
          })),
          timestamp: new Date(Date.now() - Math.random() * 604800000).toISOString(), // random time in last week
          trendId: trend.id
        });
      }
    });

    return posts;
  };

  let mockPosts = [];

  // Generate mock users with detailed information
  const generateMockUsers = () => {
    const baseUsers = [
      { id: "20230001", nickname: "Alex Chen", avatar: `https://picsum.photos/id/1005/200/200` },
      { id: "20230002", nickname: "Emma Wilson", avatar: `https://picsum.photos/id/1000/200/200` },
      { id: "20230003", nickname: "Ryan Lee", avatar: `https://picsum.photos/id/1012/200/200` },
      { id: "20230004", nickname: "Sophia Wang", avatar: `https://picsum.photos/id/1027/200/200` },
      { id: "20230005", nickname: "David Kim", avatar: `https://picsum.photos/id/1025/200/200` },
      { id: "20230006", nickname: "Olivia Davis", avatar: `https://picsum.photos/id/1062/200/200` },
      { id: "20230007", nickname: "Noah Thompson", avatar: `https://picsum.photos/id/1074/200/200` },
      { id: "20230008", nickname: "Ava Martinez", avatar: `https://picsum.photos/id/1082/200/200` },
      { id: "20230009", nickname: "Liam Garcia", avatar: `https://picsum.photos/id/1092/200/200` },
      { id: "20230010", nickname: "Sophie Anderson", avatar: `https://picsum.photos/id/1094/200/200` },
    ];

    // Add followers count and recent post images
    return baseUsers.map(user => {
      // Generate random followers count (10-500)
      const followersCount = Math.floor(Math.random() * 491) + 10;
      
      // Get recent post images from their posts
      const userPosts = mockPosts.filter(post => post.authorId === user.id);
      const recentPostImages = userPosts
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3) // Get up to 3 most recent posts
        .flatMap(post => post.images); // Extract all images from these posts
      
      // If user has no posts with images, generate some random ones
      const finalImages = recentPostImages.length > 0 ? recentPostImages : 
        Array(Math.floor(Math.random() * 3) + 1).fill(0)
          .map(() => `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/200/200`);
      
      return {
        ...user,
        followers: followersCount,
        recentPostsImages: finalImages
      };
    });
  };

  // Get mock user data for searching by author name
  const getMockUsers = () => {
    return generateMockUsers();
  };

  const getFeedData = (filter) => {
    if (mockPosts.length === 0) {
      mockPosts = generateMockPosts();
    }

    const mockUsers = getMockUsers();
    let filteredPosts = [...mockPosts];

    // Apply search filter if there's a query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(post => {
        // Check post content
        const contentMatch = post.content.toLowerCase().includes(query);
        
        // Check author nickname
        const author = mockUsers.find(user => user.id === post.authorId);
        const authorMatch = author ? author.nickname.toLowerCase().includes(query) : false;
        
        // Check post tags
        const tagsMatch = post.tags.some(tag => tag.toLowerCase().includes(query));
        
        // Check trend information
        const trend = state.trends.find(t => t.id === post.trendId);
        const trendMatch = trend ? 
          trend.tag.toLowerCase().includes(query) || 
          trend.description.toLowerCase().includes(query) : false;
        
        // Return true if any match is found
        return contentMatch || authorMatch || tagsMatch || trendMatch;
      });
    }

    // Apply filter (trending/users) and selected trend
    if (filter === "trending") {
      if (state.selectedTrend) {
        filteredPosts = filteredPosts.filter(post => post.trendId === state.selectedTrend.id);
      }
    }

    // Sort by timestamp (newest first)
    return filteredPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
    return panelMap[state.filter] || panelMap.trending;
  };

  // Render a single user card
  const renderUserCard = (user, index) => {
    const card = document.createElement("div");
    card.className = "user-card";
    card.dataset.userId = user.id;
    card.style.animationDelay = `${index * 0.05}s`;
    card.style.backgroundColor = 'var(--md-sys-color-surface-container-low)';
    card.style.borderRadius = '12px';
    card.style.padding = '16px';
    card.style.marginBottom = '16px';
    card.style.cursor = 'pointer';
    card.style.transition = 'background-color 0.2s ease, transform 0.2s ease';
    
    // Add hover effect
    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'var(--md-sys-color-surface-container)';
      card.style.transform = 'translateY(-2px)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = 'var(--md-sys-color-surface-container-low)';
      card.style.transform = 'translateY(0)';
    });
    
    // Add click event to navigate to user profile
    card.addEventListener('click', () => {
      window.location.href = `profile.html?id=${user.id}`;
    });
    
    // Render user avatar
    const avatarHtml = user.avatar 
      ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.nickname)}" style="width:64px; height:64px; border-radius:16px; object-fit:cover; margin-bottom:12px;">`
      : `<div class="author-avatar brand-mark" style="width: 64px; height: 64px; font-size: 24px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">${String(user.id).substring(0,2)}</div>`;
    
    // Render recent post images
    const recentImagesHtml = user.recentPostsImages.map(img => 
      `<img src="${img}" style="width:60px; height:60px; border-radius:8px; object-fit:cover; margin-right:8px; margin-bottom:8px;" onerror="this.style.display='none';">`
    ).join('');
    
    // Format followers count
    const followersText = user.followers === 1 ? '1 follower' : `${user.followers} followers`;
    
    card.innerHTML = `
      ${avatarHtml}
      <div class="md-typescale-title-small" style="margin-bottom:4px;">${escapeHtml(user.nickname)}</div>
      <div class="md-typescale-body-small" style="color: var(--md-sys-color-on-surface-variant); margin-bottom:12px;">${escapeHtml(user.id)}</div>
      <div class="md-typescale-body-small" style="color: var(--md-sys-color-on-surface-variant); margin-bottom:12px;">${followersText}</div>
      <div class="user-recent-posts" style="display:flex; flex-wrap:wrap;">
        ${recentImagesHtml}
      </div>
    `;
    
    return card;
  };

  const renderFeed = () => {
    const panel = getActivePanel();
    
    panel.list.innerHTML = "";

    // If we're on the Users tab, render user cards instead of posts
    if (state.filter === "users") {
      const mockUsers = generateMockUsers();
      let filteredUsers = [...mockUsers];
      
      // Apply search filter if there's a query
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.nickname.toLowerCase().includes(query) || 
          user.id.toLowerCase().includes(query)
        );
      }
      
      if (!filteredUsers.length) {
        panel.empty.hidden = false;
        return;
      }
      
      panel.empty.hidden = true;
      
      const fragment = document.createDocumentFragment();
      filteredUsers.forEach((user, index) => {
        const userCard = renderUserCard(user, index);
        fragment.appendChild(userCard);
      });
      
      panel.list.appendChild(fragment);
      return;
    }
    
    // Original post rendering logic for other filters
    const posts = getFeedData(state.filter).map(normalizePost);

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

      const imagesMarkup = (post.images || []).map(img => `<img src="${img}" style="border-radius: 12px; margin-top: 8px; max-height: 300px; object-fit: cover;" onerror="this.style.display='none';">`).join("");
      
      const user = window.DB ? window.DB.ctx() : null;
      const isLiked = user && post.likes.includes(user.id);
      const likeIcon = isLiked ? 'favorite' : 'favorite_border';

      // Mock author data since we don't have access to DB
      const mockUsers = {
        "20230001": { id: "20230001", nickname: "Alex Chen", avatar: `https://picsum.photos/id/1005/200/200` },
        "20230002": { id: "20230002", nickname: "Emma Wilson", avatar: `https://picsum.photos/id/1000/200/200` },
        "20230003": { id: "20230003", nickname: "Ryan Lee", avatar: `https://picsum.photos/id/1012/200/200` },
        "20230004": { id: "20230004", nickname: "Sophia Wang", avatar: `https://picsum.photos/id/1027/200/200` },
        "20230005": { id: "20230005", nickname: "David Kim", avatar: `https://picsum.photos/id/1025/200/200` },
      };

      const author = mockUsers[post.authorId] || { id: post.authorId, nickname: post.authorId, avatar: null };
      const avatarHtml = (author.avatar)
        ? `<div class="author-avatar" style="cursor: pointer;" data-author-id="${post.authorId}"><img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.nickname || author.id)}" style="width:32px; height:32px; border-radius:12px; object-fit:cover;"></div>`
        : `<div class="author-avatar brand-mark" style="cursor: pointer; width: 32px; height: 32px; font-size: 14px;" data-author-id="${post.authorId}">${String(author.id).substring(0,2)}</div>`;

      // Check if user is logged in and not the author
      const isCurrentUser = user && String(user.id) === String(post.authorId);
      
      // Generate more options menu based on rules
      let moreMenuHtml = '';
      if (user) {
        let menuItems = [];
        if (isCurrentUser) {
          // Post author is current user: Edit and Delete
          menuItems.push(`<div class="post-more-item post-edit-btn" data-post-id="${post.id}">Edit</div>`);
          menuItems.push(`<div class="post-more-item post-delete-btn" data-post-id="${post.id}">Delete</div>`);
        } else {
          // Post author is not current user: Follow option
          menuItems.push(`<div class="post-more-item btn-follow" data-author-id="${post.authorId}">Follow</div>`);
        }
        
        if (menuItems.length > 0) {
          moreMenuHtml = `
            <div class="post-more-container">
              <md-icon-button class="post-more-btn" aria-label="More options" data-post-id="${post.id}">
                <md-icon>more_vert</md-icon>
              </md-icon-button>
              <div class="post-more-menu" style="display: none;">
                ${menuItems.join('')}
              </div>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="post-header">
          ${avatarHtml}
          <div style="flex:1; margin-left: 12px;">
            <div class="post-author md-typescale-title-small">${escapeHtml(
            author ? (author.nickname || author.id) : post.authorId
          )}</div>
            <div class="post-meta md-typescale-body-small">${escapeHtml(
            formatTime(post.timestamp)
          )}</div>
          </div>
          ${moreMenuHtml}
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
          <md-text-button type="button" style="display: none;">Share</md-text-button>
        </div>
      `;
      fragment.appendChild(card);
    });

    panel.list.appendChild(fragment);

    // Add event listeners for author avatars
    panel.list.querySelectorAll('.author-avatar').forEach(avatar => {
      avatar.addEventListener('click', () => {
        const authorId = avatar.dataset.authorId;
        window.location.href = `profile.html?id=${authorId}`;
      });
    });
  };

  const setActiveFilter = (filter) => {
    state.filter = filter;

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

  // Render trends list
  const renderTrends = () => {
    const trendsList = document.getElementById('trends-list');
    if (!trendsList) return;
    
    let filteredTrends = state.trends;
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filteredTrends = state.trends.filter(trend => 
        trend.tag.toLowerCase().includes(query) || 
        trend.description.toLowerCase().includes(query)
      );
    }
    
    trendsList.innerHTML = '';
    
    filteredTrends.forEach(trend => {
      const trendCard = document.createElement('div');
      trendCard.className = 'trend-card';
      trendCard.innerHTML = `
        <div class="md-typescale-title-small">${escapeHtml(trend.tag)}</div>
        <div class="md-typescale-body-small">${escapeHtml(trend.description)}</div>
        <div class="trend-posts-count">${trend.posts} posts</div>
      `;
      
      trendCard.addEventListener('click', () => {
        state.selectedTrend = state.selectedTrend && state.selectedTrend.id === trend.id ? null : trend;
        renderTrends();
        renderFeed();
      });
      
      if (state.selectedTrend && state.selectedTrend.id === trend.id) {
        trendCard.style.backgroundColor = 'var(--md-sys-color-primary-container)';
        trendCard.style.color = 'var(--md-sys-color-on-primary-container)';
      }
      
      trendsList.appendChild(trendCard);
    });
  };

  // Initialize search functionality
  const initSearch = () => {
    const searchInput = document.getElementById('explore-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTrends();
        renderFeed();
      });
    }
  };

  if (tabs) {
    tabs.addEventListener("change", () => {
      // Find the currently active tab instead of relying on activeTabIndex
      const activeTab = tabButtons.find(tab => tab.hasAttribute("active"));
      const nextFilter = activeTab?.dataset.filter || "trending";
      setActiveFilter(nextFilter);
    });
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      setActiveRoute(route);

      if (route === "home") {
        window.location.href = "index.html";
      } else if (route === "profile") {
        const currentUser = window.DB?.getCurrentUser();
        if (currentUser) {
          window.location.href = "profile.html";
        } else {
          window.location.href = "auth.html";
        }
      } else if (route === "notification") {
        window.location.href = "notifications.html";
      }
    });
  });

  // Initialize trends and feed
  renderTrends();
  setActiveFilter(state.filter);
  setActiveRoute(state.route);
  initSearch();

  // Render real following list from LocalStorage
  const renderFollowingList = () => {
    const followingListContainer = document.getElementById('my-following-list');
    const emptyState = document.getElementById('my-following-empty');
    
    if (!followingListContainer || !emptyState) return;
    
    followingListContainer.innerHTML = '';
    
    // Get current user
    const currentUser = DB.ctx();
    
    // Check if user is logged in and has following list
    if (!currentUser || !currentUser.following || currentUser.following.length === 0) {
      // Show empty state
      emptyState.hidden = false;
      followingListContainer.hidden = true;
      return;
    }
    
    // Hide empty state
    emptyState.hidden = true;
    followingListContainer.hidden = false;
    
    // Get detailed information for each followed user
    currentUser.following.forEach(followingId => {
      const user = DB.getUserById(followingId);
      if (user) {
        const listItem = document.createElement('li');
        listItem.className = 'helper-list-item';
        listItem.textContent = user.nickname || user.id;
        listItem.dataset.following = followingId;
        
        // Add click event
        listItem.addEventListener('click', () => {
          console.log(`Following clicked: ${user.nickname || user.id} (${followingId})`);
          // Navigate to user profile
          window.location.href = `profile.html?id=${followingId}`;
        });
        
        followingListContainer.appendChild(listItem);
      }
    });
  };
  
  // Generate combined title based on selected navigation and filter
  const generateCombinedTitle = () => {
    // Get the display name for the navigation
    const navigationName = state.selectedNavigation === 'trending' ? 'Trending' : 
                          state.selectedNavigation === 'topics' ? 'Topics' :
                          state.selectedNavigation === 'clubs' ? 'Clubs' :
                          state.selectedNavigation === 'people' ? 'Users' :
                          state.selectedNavigation === 'events' ? 'Events' : 'Trending';
    
    // If there's a selected filter, add it to the title
    if (state.selectedFilter) {
      return `${navigationName} (${state.selectedFilter})`;
    }
    
    // Otherwise just return the navigation name
    return navigationName;
  };
  
  // Update the feed title based on current state
  const updateFeedTitle = () => {
    const feedTitle = document.querySelector('.panel-section .section-title');
    if (feedTitle) {
      feedTitle.textContent = generateCombinedTitle();
    }
  };
  
  // Initialize helper panel event listeners
  const initHelperPanel = () => {
    // Explore Navigation items
    document.querySelectorAll('.helper-list-item[data-navigation]').forEach(item => {
      item.addEventListener('click', () => {
        const navigation = item.dataset.navigation;
        
        // Remove active class from all navigation items
        document.querySelectorAll('.helper-list-item[data-navigation]').forEach(navItem => {
          navItem.classList.remove('active');
        });
        
        // Add active class to the clicked item
        item.classList.add('active');
        
        // Update state based on navigation
        if (navigation === 'people') {
          state.filter = 'users';
        } else {
          state.filter = 'trending';
        }
        
        // Update selected navigation in state
        state.selectedNavigation = navigation;
        
        // Reset any selected trend
        state.selectedTrend = null;
        
        // Simulate content filtering with animation
        const feedPanel = document.querySelector('.feed-panel');
        
        // Add fade out effect
        feedPanel.style.opacity = '0.7';
        feedPanel.style.transition = 'opacity 0.3s ease';
        
        // Simulate loading with a small delay
        setTimeout(() => {
          // Add fade in effect
          feedPanel.style.opacity = '1';
          
          // Update the feed title based on current state
          updateFeedTitle();
          
          // Generate new mock posts for different navigation
          mockPosts = generateMockPosts();
          
          // Render the feed with updated data
          renderFeed();
        }, 300);
      });
    });
    
    // Quick Filters
    document.querySelectorAll('.quick-filter').forEach(item => {
      item.addEventListener('click', () => {
        const filter = item.dataset.filter;
        
        // Remove active class from all quick filters
        document.querySelectorAll('.quick-filter').forEach(filterItem => {
          filterItem.classList.remove('active');
        });
        
        // Add active class to the clicked filter
        item.classList.add('active');
        
        // Update selected filter in state
        state.selectedFilter = filter;
        
        // Simulate content filtering with animation
        const feedPanel = document.querySelector('.feed-panel');
        
        // Add scale effect
        feedPanel.style.transform = 'scale(0.98)';
        feedPanel.style.transition = 'transform 0.2s ease';
        
        // Simulate loading with a small delay
        setTimeout(() => {
          // Reset scale
          feedPanel.style.transform = 'scale(1)';
          
          // Update the feed title based on current state
          updateFeedTitle();
          
          // Generate new mock posts with different characteristics based on filter
          // For academic filter, make more academic content
          // For popular filter, add more likes/comments
          if (filter === 'academic') {
            mockPosts = generateMockPosts().map(post => {
              // Make posts more academic
              post.content = post.content.replace(/(great|good|amazing)/gi, 'insightful');
              post.content += ' #academic #research';
              return post;
            });
          } else if (filter === 'popular') {
            mockPosts = generateMockPosts().map(post => {
              // Make posts more popular
              post.likes = Array(Math.floor(Math.random() * 100) + 50).fill('').map((_, i) => `user${i}`);
              post.comments = Array(Math.floor(Math.random() * 40)).fill('').map((_, i) => ({
                id: `comment${post.id}${i}`,
                authorId: `user${Math.floor(Math.random() * 10)}`,
                content: `Excellent post! ${Math.random() > 0.5 ? '💯' : 'I learned a lot!'}`,
                timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
              }));
              return post;
            });
          } else if (filter === '24h') {
            mockPosts = generateMockPosts().map(post => {
              // Make posts from last 24 hours
              post.timestamp = new Date(Date.now() - Math.random() * 86400000).toISOString();
              return post;
            });
          } else {
            // Default filter
            mockPosts = generateMockPosts();
          }
          
          // Render the feed with updated data
          renderFeed();
        }, 200);
      });
    });
    
    // Render following list on initialization
    renderFollowingList();
    
    // Listen for database updates to refresh the following list
    window.addEventListener('db:update', () => {
      renderFollowingList();
    });

  };

  // Initialize helper panel
  initHelperPanel();

  // Initialize PostEditor if available
  if (window.PostEditor) {
    PostEditor.init();
  }
})();
