# ILM Administrator User Interface

> This repository is part of the open source project ILM. You can find more information about the project at the [ILM](https://github.com/OmniTrustILM/ilm) repository, including the contribution guide.

Administrator User Interface or commonly called as Admin UI consists of the administrative web interface where various administrative tasks can be performed on top of the platform by the administrators.

### Details of objects

The links and pages are constructed in a way to make the navigation between the pages easier. To view the details of any object the user can simply click on the name to be redirected to the detailed view.

### Icons and tooltips

For the ease of understanding and usage, the icons are added with tooltip to understand the actions it provides when needed.

### Operations

Bulk operations can be performed on most of the objects from their list page. To perform any operation on a single object (for example - a connector), the user can do it either from the list page or the details page.

For more information, please refer to the [ILM documentation](https://docs.otilm.com).

### Generating API Types

This section provides a guide on how to generate typeScript tlasses for DTOs and APIs from the OpenAPI specification, including some required customizations

#### Step 1: Generate TypeScript Data Transfer Objects (DTOs)

To generate TypeScript Data Transfer Objects (DTOs) from the OpenAPI specification, use the following command. This command will generate the types and format the generated files using Prettier.

```sh
npm run generate-types
```

#### Step 2: Fix Type Errors in Generated Code

Sometimes, you may encounter type errors in the generated code, such as:

```sh
Type 'PaginationRequestDto' is not assignable to type 'string | number | boolean | (string | number | boolean)[]'.ts(2322)
(property) 'paginationRequestDto': PaginationRequestDto
```

Original generated code:

```sh
const query: HttpQuery = { // required parameters are used directly since they are already checked by throwIfNullOrUndefined
    'paginationRequestDto': paginationRequestDto,
};
```

Updated code to fix the type error:

```sh
const query: HttpQuery = {};
if (paginationRequestDto != null) {
    Object.assign(query, paginationRequestDto);
}
```

This change ensures that paginationRequestDto is only assigned to query if it is not null or undefined, avoiding the type error.

#### Step 3: Manually Add BaseAttributeContentDto to DataAttribute Interface

Currently, when OpenAPI model types are generated, the BaseAttributeContentDto gets removed from the `DataAttribute` interface. This issue arises due to internal library problem generating hierarchical (inheritance) types.

Update interface DataAttribute as following

```sh
interface DataAttribute {
    # Add the following property to DataAttribute interface
    /**
     * Content of the Attribute
     * @type {Array<BaseAttributeContentDto>}
     * @memberof DataAttribute
     */
    content?: Array<BaseAttributeContentDto>;
}
```

Make sure to manually add the content property back to the DataAttribute interface after generating the types.

Do not forget to import BaseAttributeContentDto

```sh
import type {
    AttributeCallback,
    AttributeContentType,
    AttributeType,
    BaseAttributeConstraint, # Add this import
    DataAttributeProperties,
} from './';
```

#### Utils service types and remaining CZERTAINLY branding

`npm run generate-types-utils` regenerates `src/types/openapi/utils` from the spec configured as `typescript-rxjs-utils` in `openapitools.json`. That spec is still served from `https://api.czertainly.com/utils/main/utils-service.yaml`, so the generated files under `src/types/openapi/utils` still carry `CZERTAINLY Utils Service API` / `getinfo@czertainly.com` headers. This is the only remaining CZERTAINLY branding in the generated code and it cannot be fixed here — do **not** hand-edit those headers, they would be overwritten on the next regeneration. It clears once `utils-service` is rebranded and publishes an ILM spec URL, tracked under the platform rebrand epic [OmniTrustILM/ilm#108](https://github.com/OmniTrustILM/ilm/issues/108).

## Docker container

Admin Web Interface is provided as a Docker container. Use the `docker pull hub.omnitrustregistry.com/ilm/frontend-administrator:tagname` to pull the required image from the repository. It can be configured using the following environment variables:

| Variable     | Description                                            | Required                                      | Default value    |
| ------------ | ------------------------------------------------------ | --------------------------------------------- | ---------------- |
| `BASE_URL`   | URL Path of the frontend application                   | ![](https://img.shields.io/badge/-NO-red.svg) | `/administrator` |
| `API_URL`    | URL Path of the ILM API for the web application        | ![](https://img.shields.io/badge/-NO-red.svg) | `/api`           |
| `LOGIN_URL`  | URL Path of the login page                             | ![](https://img.shields.io/badge/-NO-red.svg) | `/login`         |
| `LOGOUT_URL` | URL Path of the logout page                            | ![](https://img.shields.io/badge/-NO-red.svg) | `/logout`        |
