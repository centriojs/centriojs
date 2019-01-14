'use strict';

const _ = require('../mixin');

class ContentTypeRoutes {
    constructor() {
        appEvent.on( 'loaded', this.setContentRoutes.bind(this) );
        appEvent.on( 'adminInit', this.setContentAdminRoutes.bind(this) );
    }

    async setContentRoutes(router) {
        router.use(this.checkRoute.bind(this));
    }

    async checkRoute( req, res, next ) {
        let route = req.originalUrl,
            page = req.param.page;

        // Remove page query
        route = _.routePath(route).remove('page');

        let endPoint = await getEndPoint(route).cach(errorHandler);
        if ( ! endPoint || endPoint.error ) {
            return next();
        }

        let response;
        switch( endPoint.type ) {
            case 'archive' :
                response = this.archiveView( endPoint.typeId, page );

                break;

            case 'category' :
                response = this.categoryView( endPoint.typeId, endPoint.catId, page );
                break;

            case 'tag' :
                response = this.tagView( endPoint.typeId, endPoint.tagId, page );

                break;

            default :
                response = this.contentView( endPoint.typeId, endPoint.contentId );
                break;
        }
    }

    async archiveView( typeId, page ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let response = {},
            queryArgs = {
                typeId: contentType.ID,
                page: page,
                perPage: contentType.settings.itemsPerPage
            };

        if ( isUserLoggedIn() ) {
            queryArgs.status__in = ['public', 'private'];
        } else {
            queryArgs.status = 'public';
        }

        response.contents = await getContents(queryArgs);

        return response;
    }

    async categoryView( typeId, catId, page ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let category = await getCategory( typeId, catId ).catch(errorHandler);
        if ( ! category || category.error ) {
            return false;
        }

        let response = {},
            queryArgs = {
                typeId: contentType.ID,
                page: page,
                perPage: contentType.settings.itemsPerPage,
                category: catId
            };

        if ( isUserLoggedIn() ) {
            queryArgs.status__in = ['public', 'private'];
        } else {
            queryArgs.status = 'public';
        }

        response.contents = await getContents(queryArgs);

        return response;
    }

    async tagView( typeId, tagId, page ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let tag = await getTag( typeId, tagId ).catch(errorHandler);
        if ( ! tag || tag.error ) {
            return false;
        }

        let response = {},
            queryArgs = {
                typeId: contentType.ID,
                page: page,
                perPage: contentType.settings.itemsPerPage,
                tag: tagId
            };

        if ( isUserLoggedIn() ) {
            queryArgs.status__in = ['public', 'private'];
        } else {
            queryArgs.status = 'public';
        }

        response.contents = await getContents(queryArgs);
    }

    async contentView( typeId, contentId ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let content = await getContent( typeId, contentId ).catch(errorHandler);
        if ( ! content || content.error ) {
            return false;
        }

        let response = {
            title: content.title,
            content: content
        };

        return response;
    }

    async setContentAdminRoutes(router) {
        this.router = router;

        router.setView( '/contents', this.getContentTypes.bind(this) );
        router.setView( '/contents/page/:page', this.getContentTypes.bind(this) );
        router.setView( '/contents/edit', this.editContentType.bind(this) );
        router.setView( '/contents/edit/:id', this.editContentType.bind(this) );
        router.post( '/contents/edit', this.updateContentType.bind(this) );
        router.post( '/contents/edit/:id', this.updateContentType.bind(this) );
        router.get( '/contents/delete/:id', this.deleteContentType.bind(this) );

        router.setView( '/content/:type', this.contentManager.bind(this) );
        router.setView( '/content/:type/page/:page', this.contentManager.bind(this) );
        router.setView( '/content/:type/edit', this.editContent.bind(this) );
        router.setView( '/content/:type/edit/:id', this.editContent.bind(this) );
        router.setView( '/content/:type/status/:status', this.contentManager.bind(this) );
        router.setView( '/content/:type/status/:status/page/:page', this.contentManager.bind(this) );
        router.post( '/content/:type/edit', this.updateContent.bind(this) );
        router.post( '/content/:type/edit/:id', this.updateContent.bind(this) );
        router.get( '/content/:type/delete/:id', this.deleteContent.bind(this));

        router.setView( '/content/:type/categories', this.categoryManager.bind(this) );
        router.setView( '/content/:type/categories/page/:page', this.categoryManager.bind(this) );
        router.setView( '/content/:type/category', this.editCategory.bind(this) );
        router.setView( '/content/:type/category/:id', this.editCategory.bind(this) );
        router.post( '/content/:type/category', this.updateCategory.bind(this) );
        router.post( '/content/:type/category/:id', this.updateCategory.bind(this) );
        router.get( '/content/:type/delete-category/:id', this.deleteCategory.bind(this) );

        router.setView( '/content/:type/tags', this.tagManager.bind(this) );
        router.setView( '/content/:type/tags/page/:page', this.tagManager.bind(this) );
        router.post( '/content/:type/tag', this.updateTag.bind(this) );
        router.post( '/content/:type/tag/:id', this.updateTag.bind(this) );
        router.get( '/content/:type/tag/:id', this.deleteTag.bind(this) );

        router.setView( '/content/:type/comments', this.commentsManager.bind(this) );
        router.setView( '/content/:type/comments/page/:page', this.commentsManager.bind(this) );
        router.setView( '/content/:type/comments/status/:status', this.commentsManager.bind(this) );
    }

    async getContentTypes(param) {
        let page = param && param.page || 1,
            queryArgs = {},
            response = {
                title: il8n('Contents'),
                templateNow: 'ContentTypes'
            };

        let settings = await getUserSetting( currentUser.ID, '__content-types', {
            perPage: 50
        });

        queryArgs.page = page;
        queryArgs.perPage = settings.perPage;

        if ( param && param.search ) {
            queryArgs.search = param.search;
        }

        if ( param && param.status ) {
            queryArgs.status = param.status;
        }

        response.contentTypes = await getContentTypes(queryArgs);
        response.userSettings = settings;

        return response;
    }

    async editContentType(param) {
        let id = param && param.id || false,
            response = {
                title: id ? il8n('Edit Content Type') : il8n('New Content Type'),
                templateNow: 'EditContentType'
            };

        if ( id ) {
            let type = await getContentType(id).catch(errorHandler);

            if ( type.ID ) {
                response.contentType = type;
            }
        }

        return response;
    }

    async updateContentType( req, res ) {
        let id = req.param.id || false,
            fields = ['name', 'public', 'status', 'hierarchical', 'hasCategories', 'hasTags', 'hasThumbnail',
                'hasComments', 'hasArchive', 'categoryTemplate', 'tagTemplate', 'slug', 'fields', 'settings'],
            contentType = _.pick( $_POST, fields ),
            response = {};

        contentType = _.stripSlashes(contentType);

        if ( id ) {
            contentType.ID = id;

            let done = await updateContentType(contentType).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update content type.');

                return res.json(response);
            }

            response.ID = id;
            response.success = true;
            response.message = il8n('Update successfully completed.');

            return res.json(response);
        }

        id = await addContentType(contentType).catch(errorHandler);
        if ( ! id || id.error ) {
            response.error = true;
            response.message = id.message || il8n('Something went wrong. Unable to update content type.');

            return res.json(response);
        }

        response.ID = id;
        response.success = true;
        response.message = il8n('New content type successfully added.');

        return res.json(response);
    }

    async deleteContentType( req, res ) {
        let id = req.param.id,
            response = {};

        let done = await deleteContentType(id).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete the selected content type.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Content type successfully deleted.');

        return res.json(response);
    }

    async contentManager(param) {
        let type = param && param.type || false,
            page = param && param.page || 1,
            status = param && param.status || false,
            queryArgs = {},
            response = {
                templateNow: 'ContentManager'
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            let msg = il8n('Invalid content type.');

            return this.router.setError( msg, msg );
        }

        // @todo: Check and validate user caps

        response.title = contentType.name;

        let settings = await getUserSetting( currentUser.ID, '__' + contentType.slug, {
            perPage: 50,
            columns: ['title', 'author', 'date']
        });
        response.userSettings = settings;

        queryArgs.page = page;
        queryArgs.perPage = settings.perPage;
        queryArgs.typeId = contentType.ID;

        if ( status ) {
            queryArgs.status = status;
        }

        response.contents = await getContents(queryArgs);

        return response;
    }

    async editContent(param) {
        let type = param && param.type,
            id = param && param.id || false,
            response = {
                templateNow: 'EditContent'
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            let msg = il8n('Invalid content type.');

            return this.router.setError( msg, msg );
        }

        response.title = id ? il8n('Edit ' + contentType.name) : il8n('New ' + contentType.name );

        if ( id ) {
            let content = await getContent( contentType.ID, id ).catch(errorHandler);

            if ( content.ID ) {
                response.content = content;
            }
        }

        return response;
    }

    async updateContent( req, res ) {
        let type = req.param.type,
            id = req.param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let fields = contentType.fields;
        fields.push('status');

        if ( contentType.hasComments ) {
            fields.push('comment_status');
        }

        let content = _.pick( $_POST, fields );

        content = _.stripSlashes(content);
        content.typeId = contentType.ID;

        if ( id ) {
            content.ID = id;
            let done = await updateContent( content ).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update content.');

                return res.json(response);
            }

            response.message = il8n('Update successful.');
        } else {
            id = await addContent(content).catch(errorHandler);

            if ( ! id || id.error ) {
                response.error = true;
                response.message = id.message || il8n('Something went wrong. Content cannot be added.');

                return res.json(response);
            }

            response.message = il8n('New content successfully added.');
        }

        response.ID = id;
        response.success = true;

        return res.json(response);
    }

    async deleteContent( req, res ) {
        let type = req.param.type,
            id = req.param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let done = await deleteContent( contentType.ID, id ).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete the selected content.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Content successfully deleted.');

        return res.json(response);
    }

    async categoryManager(param) {
        let type = param && param.type,
            page = param && param.page || 1,
            queryArgs = {},
            response = {
                title: il8n('Categories'),
                templateNow: 'CategoryManager'
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        response.categories = await getCategories( contentType.ID, queryArgs );

        return response;
    }

    async editCategory(param) {
        let type = param && param.type,
            id = param && param.id || false,
            response = {
                title: id ? il8n('New Category') : il8n('Edit Category'),
                templateNow: 'EditCategory'
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        if ( id ) {
            let category = await getCategory( contentType.ID, id ).catch(errorHandler);

            if ( category.ID ) {
                response.category = category;
            }
        }

        return response;
    }

    async updateCategory( req, res ) {
        let type = req.param.type,
            id = req.param.id || false,
            category = _.pick( $_POST, ['name', 'description', 'slug', 'parent'] ),
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        category = _.stripSlashes(category);

        if ( id ) {
            category.ID = id;

            let done = await updateCategory( contentType.ID, category ).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update category.');

                return res.json(response);
            }

            response.message = il8n('Update successful.');

        } else {
            id = await addCategory( contentType.ID, category ).catch(errorHandler);
            if ( ! id || id.error ) {
                response.error = true;
                response.message = id.message || il8n('Something went wrong. Unable to add new category.');

                return res.json(response);
            }
            response.message = il8n('New category successfully added.');
        }

        response.ID = id;
        response.success = true;

        return res.json(response);
    }

    async deleteCategory( req, res ) {
        let type = req.param.type,
            id = req.param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let done = await deleteCategory( contentType.ID, id ).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete the selected category.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Category successfully deleted.');

        return res.json(response);
    }

    async tagManager(param) {
        let type = param && param.type,
            page = param && param.page || 1,
            queryArgs = {},
            response = {
                title: il8n('Tags')
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        response.tags = await getTags( contentType.ID, queryArgs );

        return response;
    }

    async editTag(param) {
        let type = param && param.type,
            id = param && param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        if ( id ) {
            let tag = await getTag( contentType.ID, id ).catch(errorHandler);

            if ( tag && tag.ID ) {
                response.tag = tag;
            }
        }

        return response;
    }

    async updateTag( req, res ) {
        let type = req.param.type,
            id = req.param.id || false,
            tag = _.pick( $_POST, ['name', 'description', 'slug', 'parent'] ),
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        if ( id ) {
            tag.ID = id;
            let done = await updateTag( contentType.ID, tag ).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update the given tag.');

                return res.json(response);
            }

            response.message = il8n('Update successfully completed.');
        } else {
            id = await addTag( contentType.ID, tag ).catch(errorHandler);

            if ( ! id || id.error ) {
                response.error = true;
                response.message = id.message || il8n('Something went wrong. Unable to add new tag.');

                return res.json(response);
            }

            response.message = il8n('New tag successfully added.');
        }

        response.ID = id;
        response.success = true;

        return res.json(response);
    }

    async deleteTag( req, res ) {
        let type = req.param.type,
            id = req.param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let done = await deleteTag( contentType.ID, id ).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete the selected tag.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Tag successfully deleted.');

        return res.json(response);
    }

    async commentsManager(param) {
        let type = param && param.type,
            page = param && param.page || 1,
            status = param && param.status,
            queryArgs = {},
            response = {
                title: il8n('Comments'),
                templateNow: 'CommentsManager'
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        queryArgs.typeId = contentType.ID;

        response.comments = await getComments(queryArgs);

        return response;
    }

    async updateComment( req, res ) {
        let type = req.param.type,
            contentId = req.param.contentId,
            id = req.param.id,
            comment = ['comment', 'author', 'authorEmail', 'authorUrl', 'status'],
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        // @todo: check if user can add new comment

        comment = _.pick( $_POST, comment );
        comment = _.stripSlashes(comment);
        comment.contentId = contentId;

        // @todo: check if user can

        if ( id ) {
            comment.ID = id;

            let done = await updateComment( contentType.ID, comment ).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update comment.');

                return res.json(response);
            }

            response.message = il8n('Update successfully completed.');
        } else {
            id = await addComment( contentType.ID, comment ).catch(errorHandler);

            if ( ! id || id.error ) {
                response.error = true;
                response.message = id.message || il8n('Something went wrong. Unable to add new comment.');

                return res.json(response);
            }

            response.message = il8n('New comment successfully posted.');
        }

        response.ID = id;
        response.success = true;

        return res.json(response);
    }

    async editComment(param) {
        let type = param && param.type,
            id = param && param.id,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let comment = await getComment( contentType.ID, id ).catch(errorHandler);
        if ( comment && comment.ID ) {
            response.comment = comment;
        }

        return response;
    }

    async deleteComment( req, res ) {
        let type = req.param.type,
            id = req.param.id,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let done = await deleteComment( contentType.ID, id ).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete the selected comment.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Comment deleted.');

        return res.json(response);
    }
}
module.exports = new ContentTypeRoutes();