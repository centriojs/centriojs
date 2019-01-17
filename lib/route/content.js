'use strict';

const _ = require('../mixin');

class ContentTypeRoutes {
    constructor() {
        appEvent.on( 'loaded', this.setContentRoutes.bind(this) );
        appEvent.on( 'adminInit', this.setContentAdminRoutes.bind(this) );
    }

    setView( response ) {
        return this.router.callback( () => {
            return response;
        });
    }

    async setContentRoutes(router) {
        this.router = router;

        router.setView( '/search/:term', this.searchContents.bind(this) );
        router.setView( '/search/:term/page/:page', this.searchContents.bind(this) );
        router.use( this.checkRoute.bind(this) );
    }

    async searchContents( param ) {
        let term = param && param.term || '',
            page = param && param.page || 1,
            response = {
                title: il8n('Search Results'),
                typeNow: 'search',
                templateNow: 'SearchResults'
            };

        response.contents = await searchContents( term, page, 1 );

        return response;
    }

    async checkRoute( req, res, next ) {
        let route = req.path,
            page = req.params.page || 1;

        // Remove page query
        route = _.routePath(route).remove('page');

        let endPoint = await getEndPoint(route).catch(errorHandler);
        if ( ! endPoint || endPoint.error ) {
            return next();
        }

        //console.log(endPoint);

        let response;
        switch( endPoint.type ) {
            case 'archive' :
                response = await this.archiveView( endPoint.typeId, page );
                break;

            case 'taxArchive' :
                response = await this.taxTypeArchiveView( endPoint.typeId, endPoint.taxTypeId, page );
                break;

            case 'taxPage' :
                response = await this.taxArchiveView( endPoint.typeId, endPoint.taxTypeId, endPoint.termId, page );
                break;

            default :
                response = await this.contentView( endPoint.typeId, endPoint.contentId );
                break;
        }

        if ( ! response ) {
            return next();
        }

        return this.setView(response)(req, res);
    }

    async archiveView( typeId, page ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let settings = await getTypeProperty( typeId, 'settings', true ).catch(errorHandler);
        if ( ! settings ) {
            settings = {
                itemsPerPage: 50,
                archiveTitle: contentType.name
            };
        }

        let response = {
                title: settings.archiveTitle,
                pageNow: 'archive',
                typeNow: contentType.slug,
                templateNow: 'Archive'
            },
            queryArgs = {
                typeId: contentType.ID,
                page: page,
                perPage: settings.itemsPerPage
            };

        if ( isUserLoggedIn() ) {
            queryArgs.status__in = ['public', 'private'];
        } else {
            queryArgs.status = 'public';
        }

        response.contents = await getContents(queryArgs);

        return response;
    }

    async taxTypeArchiveView( typeId, taxTypeId, page ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let taxType = await getContentType(taxTypeId).catch(errorHandler);
        if ( ! taxType || taxType.error ) {
            return false;
        }

        let settings = await getTypeProperty( taxTypeId, 'settings', true ).catch(returnFalse);
        if ( ! settings ) {
            settings = {
                itemsPerPage: 50,
                archiveTitle: il8n('Archive')
            };
        }

        let response = {
            title: settings.archiveTitle,
            description: settings.archiveDescription || '',
            typeNow: contentType.slug,
            pageNow: 'taxArchive'
        };

        return response;
    }

    async taxArchiveView( typeId, taxTypeId, termId, page ) {
        let contentType = await getContentType(typeId).catch(errorHandler);

        if ( ! contentType || contentType.error ) {
            return false;
        }

        let taxType = await getContentType(taxTypeId).catch(errorHandler);
        if ( ! taxType || taxType.error ) {
            return false;
        }

        let term = await getTerm( taxTypeId, termId ).catch(errorHandler);
        if ( ! term || term.error ) {
            return false;
        }

        let response = {
            title: term.name,
            description: term.description,
            templateNow: 'Archive'
        };

        return response;
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

        let {status} = content;
        if ( 'pending' === status || 'draft' === status ) {
            // @todo: Verify if current user has capabilities
        }

        let response = {
            title: content.title,
            pageNow: 'single',
            typeNow: contentType.slug,
            templateNow: 'Single',
            content: content,
            requireLogin: 'private' === content.status
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
            fields = ['name', 'public', 'status', 'hierarchical', 'hasThumbnail', 'showUI',
                'hasComments', 'hasArchive', 'slug', 'fields'],
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

        let {settings} = $_POST,
            done = await setTypeProperty( id, 'settings', settings, true ).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to update type properties.');

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