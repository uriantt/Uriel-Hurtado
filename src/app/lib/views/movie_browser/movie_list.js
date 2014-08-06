(function(App) {
    'use strict';

    var SCROLL_MORE = 0.7; // 70% of window height
    var NUM_MOVIES_IN_ROW = 7;
    var _this;

    function elementInViewport(container, element) {
        var $container = $(container),
            $el = $(element);

        var docViewTop = $container.offset().top;
        var docViewBottom = docViewTop + $container.height();

        var elemTop = $el.offset().top;
        var elemBottom = elemTop + $el.height();

        return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom) && (elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }

    var ErrorView = Backbone.Marionette.ItemView.extend({
        template: '#movie-error-tpl',
        onBeforeRender: function() {
            this.model.set('error', this.error);
        }
    });

    var MovieList = Backbone.Marionette.CompositeView.extend({
        template: '#movie-list-tpl',

        tagName: 'ul',
        className: 'movie-list',

        itemView: App.View.MovieItem,
        itemViewContainer: '.movies',

        events: {
            'scroll': 'onScroll',
            'mousewheel': 'onScroll',
            'keydown': 'onScroll'
        },

        ui: {
            spinner: '.spinner'
        },


        isEmpty: function() {
            return !this.collection.length && this.collection.state !== 'loading';
        },

        getEmptyView: function() {
            if (this.collection.state === 'error') {
                return ErrorView.extend({
                    error: i18n.__('Error loading data, try again later...')
                });
            } else {
                return ErrorView.extend({
                    error: i18n.__('No movies found...')
                });
            }
        },

        initialize: function() {
            _this = this;
            this.listenTo(this.collection, 'loading', this.onLoading);
            this.listenTo(this.collection, 'loaded', this.onLoaded);

            App.vent.on('shortcuts:movies', function() {
                _this.initKeyboardShortcuts();
            });

            _this.initKeyboardShortcuts();

        },

        initKeyboardShortcuts: function() {
            Mousetrap.bind('up', _this.moveUp);

            Mousetrap.bind('down', _this.moveDown);

            Mousetrap.bind('left', _this.moveLeft);

            Mousetrap.bind('right', _this.moveRight);

            Mousetrap.bind(['enter', 'space'], _this.selectItem);

            Mousetrap.bind(['ctrl+f', 'command+f'], _this.focusSearch);

            Mousetrap.bind('tab', function() {
                App.vent.trigger('shows:list');
            });
        },

        unbindKeyboardShortcuts: function() {
            Mousetrap.unbind('up');

            Mousetrap.unbind('down');

            Mousetrap.unbind('left');

            Mousetrap.unbind('right');

            Mousetrap.unbind(['enter', 'space']);

            Mousetrap.unbind(['ctrl+f', 'command+f']);

            Mousetrap.unbind('tab');
        },

        onShow: function() {
            if (this.collection.state === 'loading') {
                this.onLoading();
            }
        },

        onLoading: function() {
            $('.status-loadmore').hide();
            $('#loading-more-animi').show();
        },

        onLoaded: function() {
            console.timeEnd('App startup time');
            var self = this;
            this.checkEmpty();

            $('#load-more-item').remove();
            // we add a load more
            if (this.collection.hasMore && !this.collection.filter.keywords && this.collection.state !== 'error') {
                $('.movies').append('<div id="load-more-item" class="load-more"><span class="status-loadmore">' + i18n.__('Load More') + '</span><div id="loading-more-animi" class="loading-container"><div class="ball"></div><div class="ball1"></div></div></div>');

                $('#load-more-item').click(function() {
                    $('#load-more-item').off('click');
                    self.collection.fetchMore();
                });

                $('#loading-more-animi').hide();
                $('.status-loadmore').show();
            }
            this.AddGhostsToBottomRow();
            $(window).resize(function() {
                var addghost;
                clearTimeout(addghost);
                addghost = setTimeout(function() {
                    self.AddGhostsToBottomRow();
                }, 100);
            });

            if (typeof(this.ui.spinner) === 'object') {
                this.ui.spinner.hide();
            }

            $('.filter-bar').on('mousedown', function(e) {
                if (e.target.localName !== 'div') {
                    return;
                }
                _.defer(function() {
                    self.$('.movies:first').focus();
                });
            });
            $('.movies').attr('tabindex', '1');
            _.defer(function() {
                self.$('.movies:first').focus();
            });
        },
        AddGhostsToBottomRow: function() {
            var divsInLastRow, divsInRow, to_add;
            $('.ghost').remove();
            divsInRow = 0;
            $('.movies .movie-item').each(function() {
                if ($(this).prev().length > 0) {
                    if ($(this).position().top !== $(this).prev().position().top) {
                        return false;
                    }
                    divsInRow++;
                } else {
                    divsInRow++;
                }
            });
            divsInLastRow = $('.movies .movie-item').length % divsInRow;
            if (divsInLastRow === 0) {
                divsInLastRow = divsInRow;
            }
            NUM_MOVIES_IN_ROW = divsInRow;
            to_add = divsInRow - divsInLastRow;
            while (to_add > 0) {
                $('.movies').append($('<li/>').addClass('movie-item ghost'));
                to_add--;
            }
        },
        onScroll: function() {
            if (!this.collection.hasMore) {
                return;
            }

            var totalHeight = this.$el.prop('scrollHeight');
            var currentPosition = this.$el.scrollTop() + this.$el.height();

            if (this.collection.state === 'loaded' &&
                (currentPosition / totalHeight) > SCROLL_MORE) {
                this.collection.fetchMore();
            }
        },

        focusSearch: function(e) {
            $('.search input').focus();
        },

        selectItem: function(e) {
            e.preventDefault();
            e.stopPropagation();
            $('.movie-item.selected .cover').trigger('click');
        },

        selectIndex: function(index) {
            if ($('.movies .movie-item').eq(index).length === 0 || $('.movies .movie-item').eq(index).children().length === 0) {
                return;
            }
            $('.movie-item.selected').removeClass('selected');
            $('.movies .movie-item').eq(index).addClass('selected');

            var $movieEl = $('.movie-item.selected')[0];
            if (!elementInViewport(this.$el, $movieEl)) {
                $movieEl.scrollIntoView(false);
                this.onScroll();
            }
        },

        moveUp: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var index = $('.movie-item.selected').index();
            if (index === -1) {
                index = 0;
            } else {
                index = index - NUM_MOVIES_IN_ROW;
            }
            if (index < 0) {
                return;
            }
            _this.selectIndex(index);
        },

        moveDown: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var index = $('.movie-item.selected').index();
            if (index === -1) {
                index = 0;
            } else {
                index = index + NUM_MOVIES_IN_ROW;
            }
            _this.selectIndex(index);
        },

        moveLeft: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var index = $('.movie-item.selected').index();
            if (index === -1) {
                index = 0;
            } else if (index === 0) {
                index = 0;
            } else {
                index = index - 1;
            }
            _this.selectIndex(index);
        },

        moveRight: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var index = $('.movie-item.selected').index();
            if (index === -1) {
                index = 0;
            } else {
                index = index + 1;
            }
            _this.selectIndex(index);
        },
    });

    App.View.MovieList = MovieList;
})(window.App);