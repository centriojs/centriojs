'use strict';

const _ = require('../mixin');

class ContentTypeRoutes {
    constructor() {
        this.setRoutes = this.setRoutes.bind(this);
        appEvent.on( 'loaded', this.setRoutes );

        this.setAdminRoutes = this.setAdminRoutes.bind(this);
        appEvent.on( 'adminInit', this.setAdminRoutes );
    }

    async setRoutes(router) {
        // :archive
        // :archive/page/:page
        // :archive/:category
        // :archive/:category/page/:page
        // :archive/:category/:slug
        // :archive/:category/:slug/:slug
        // :archive/:category/:slug/:slug/:slug
        // :archive/:tag
    }

    async setAdminRoutes(router) {
        // content/:type
    }

    async isTypeArchive( req, res, next ) {
        let slug = req.param.archive;

        let contentType = await getContentTypeBy( 'slug', slug ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            return next();
        }

        // @todo: return html here
    }

    async typeArchive({param}) {
        let slug = param && param.archive,
            page = param && param.page || 1,
            response = {};

        let contentType = await getContentTypeBy( 'slug', slug ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // Redirect to error page
        }

        response.title = contentType.settings.archiveTitle || il8n('Archive');
        response.description = contentType.settings.archiveDescription || false;

        let preset = await getPreset( contentType.archiveTemplate ).catch(returnFalse);
        if ( ! preset ) {
            // @todo: use default
        }

        let queryArgs = {
            typeId: contentType.ID,
            page: page,
            perPage: contentType.settings.perPage || 50
        };

        if ( currentUser && currentUser.ID ) {
            queryArgs.status__in = ['public', 'private'];
        } else {
            queryArgs.status = 'public';
        }

        response.contents = await getContents(queryArgs);

        return response;
    }

    async isCategoryArchive( req, res, next ) {
        let slug = req.param.archive,
            catSlug = req.param.category;

        let contentType = await getContentTypeBy( 'slug', slug ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            return next();
        }

        let category = await getCategoryBySlug( contentType.ID, catSlug ).catch(errorHandler);
        if ( ! category || category.error ) {
            return next();
        }

        // @todo: return category archive html
    }

    async categoryArchive() {

    }

    async isTagArchive( req, res, next ) {
        let slug = req.param.archive,
            tagSlug = req.param.tag;

        let contentType = await getContentTypeBy( 'slug', slug ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            return next();
        }

        let tag = await getTagBySlug( tagSlug ).catch(errorHandler);
        if ( ! tag || tag.error ) {
            return next();
        }

        // @todo: set tag archive here
    }

    async tagArchive() {
        let slugArchive = '';
    }

    async contentRoute() {}

    async getContentTypes({param}) {
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

    async editType({param}) {
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
            contentType = _.pick( $_POST, ['name', 'public', 'status', 'hierarchical', 'hasCategories', 'hasTag',
            'hasComments', 'hasArchive', 'categoryTemplate', 'tagTemplate', 'slug', 'fields'] ),
            response = {};

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

    async contentManager({param}) {
        let type = page && page.type || false,
            page = param && param.page || 1,
            status = param && param.status || false,
            queryArgs = {},
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        // @todo: Check and validate user caps

        response.title = contentType.name;

        let settings = await getUserSetting( currentUser.ID, '__' + contentType.slug, {
            perPage: 50
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

    async editContent({param}) {
        let type = param && param.type,
            id = param && param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        response.title = id ? il8n('Edit ' + contentType.name) : il8n('New ' + contentType.name );

        // @todo: Check and validate user caps
        if ( id ) {
            let content = await getContent(id).catch(errorHandler);

            if ( content.ID ) {
                response.content = content;
            }
        }

        return response;
    }

    async updateContent( req, res ) {
        let type = param && param.type,
            id = param && param.id || false,
            response = {};

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        let fields = contentType.fields.concat(['status']),
            content = _.pick( $_POST, fields );

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

            response.ID = id;
            response.success = true;
            response.message = il8n('Content successfully updated.');

            return res.json(response);
        }

        id = await addContent( content ).catch(errorHandler);
        if ( ! id || id.error ) {
            response.error = true;
            response.message = id.message || il8n('Something went wrong. Content cannot be added.');

            return res.json(response);
        }

        response.ID = id;
        response.success = true;
        response.message = il8n('New content successfully added.');

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

    async categoryManager({param}) {
        let type = param && param.type,
            page = param && param.page || 1,
            queryArgs = {},
            response = {
                title: il8n('Categories')
            };

        let contentType = await getContentTypeBy( 'slug', type ).catch(errorHandler);
        if ( ! contentType || contentType.error ) {
            // @todo: redirect to error page
        }

        response.categories = await getCategories( contentType.ID, queryArgs );

        return response;
    }

    async editCategory({param}) {
        let type = param && param.type,
            id = param && param.id || false,
            response = {};

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

            response.ID = id;
            response.success = true;
            response.message = il8n('Update successful.');

            return res.json(response);
        }

        id = await addCategory( contentType.ID, category ).catch(errorHandler);
        if ( ! id || id.error ) {
            response.error = true;
            response.message = id.message || il8n('Something went wrong. Unable to add new category.');

            return res.json(response);
        }

        response.ID = id;
        response.success = true;
        response.message = il8n('New category successfully added.');

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

    async tagManager({param}) {}

    async updateTag( req, res ) {}

    async deleteTag( req, res ) {}

    async addComment( req, res ) {}

    async deleteComment( req, res ) {}
}
module.exports = new ContentTypeRoutes();