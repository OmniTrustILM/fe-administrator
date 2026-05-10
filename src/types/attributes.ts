import {
    type AttributeCallback,
    type AttributeCallbackMapping,
    type AttributeMappingDto,
    AttributeType,
    type BaseAttributeConstraint,
    type BaseAttributeContentDtoV2,
    type BaseAttributeContentDtoV3,
    type BaseAttributeDto,
    type BooleanAttributeContentV2,
    type BooleanAttributeContentV3,
    type CodeBlockAttributeContentData,
    type CodeBlockAttributeContentV2,
    type CodeBlockAttributeContentV3,
    type CredentialAttributeContentData,
    type CredentialAttributeContentV2,
    type CustomAttribute,
    type CustomAttributeProperties,
    type DataAttribute,
    type DataAttributeProperties,
    type DateAttributeContentV2,
    type DateAttributeContentV3,
    type DateTimeAttributeConstraint,
    type DateTimeAttributeConstraintData,
    type DateTimeAttributeContentV2,
    type DateTimeAttributeContentV3,
    type FileAttributeContentData,
    type FileAttributeContentV2,
    type FileAttributeContentV3,
    type FloatAttributeContentV2,
    type FloatAttributeContentV3,
    type GroupAttributeV2,
    type GroupAttributeV3,
    type InfoAttributeProperties,
    type InfoAttributeV2,
    type InfoAttributeV3,
    type IntegerAttributeContentV2,
    type IntegerAttributeContentV3,
    type MetadataAttributeProperties,
    type MetadataAttributeV2,
    type MetadataAttributeV3,
    type ObjectAttributeContentV2,
    type ObjectAttributeContentV3,
    type RangeAttributeConstraint,
    type RangeAttributeConstraintData,
    type RegexpAttributeConstraint,
    type RequestAttribute,
    type ResponseAttribute,
    type SecretAttributeContentData,
    type SecretAttributeContentV2,
    type StringAttributeContentV2,
    type StringAttributeContentV3,
    type TextAttributeContentV2,
    type TextAttributeContentV3,
    type TimeAttributeContentV2,
    type TimeAttributeContentV3,
} from 'types/openapi';

// Version-specific types: use V2 types for v2 attributes, V3 types for v3 attributes
export type BooleanAttributeContentDtoV2 = BooleanAttributeContentV2;
export type BooleanAttributeContentDtoV3 = BooleanAttributeContentV3;
export type CodeBlockAttributeContentDtoV2 = CodeBlockAttributeContentV2;
export type CodeBlockAttributeContentDtoV3 = CodeBlockAttributeContentV3;
export type DateAttributeContentDtoV2 = DateAttributeContentV2;
export type DateAttributeContentDtoV3 = DateAttributeContentV3;
export type DateTimeAttributeContentDtoV2 = DateTimeAttributeContentV2;
export type DateTimeAttributeContentDtoV3 = DateTimeAttributeContentV3;
export type FileAttributeContentDtoV2 = FileAttributeContentV2;
export type FileAttributeContentDtoV3 = FileAttributeContentV3;
export type FloatAttributeContentDtoV2 = FloatAttributeContentV2;
export type FloatAttributeContentDtoV3 = FloatAttributeContentV3;
export type IntegerAttributeContentDtoV2 = IntegerAttributeContentV2;
export type IntegerAttributeContentDtoV3 = IntegerAttributeContentV3;
export type ObjectAttributeContentDtoV2 = ObjectAttributeContentV2;
export type ObjectAttributeContentDtoV3 = ObjectAttributeContentV3;
export type StringAttributeContentDtoV2 = StringAttributeContentV2;
export type StringAttributeContentDtoV3 = StringAttributeContentV3;
export type TextAttributeContentDtoV2 = TextAttributeContentV2;
export type TextAttributeContentDtoV3 = TextAttributeContentV3;
export type TimeAttributeContentDtoV2 = TimeAttributeContentV2;
export type TimeAttributeContentDtoV3 = TimeAttributeContentV3;

export type { BaseAttributeContentDtoV2, BaseAttributeContentDtoV3 } from 'types/openapi';

// Backward-compat unions (when version is unknown). Both Dto and Model are the
// same shape — Model is exported as an alias of Dto via `as` to avoid creating
// a second redundant alias declaration.
export type BooleanAttributeContentDto = BooleanAttributeContentV2 | BooleanAttributeContentV3;
export type { BooleanAttributeContentDto as BooleanAttributeContentModel };

export type CredentialAttributeContentDataDto = CredentialAttributeContentData;
export type CredentialAttributeContentDataModel = Omit<CredentialAttributeContentData, 'attributes'> & {
    attributes: Array<DataAttributeModel>;
};

export type CredentialAttributeContentDto = CredentialAttributeContentV2;
export type CredentialAttributeContentModel = Omit<CredentialAttributeContentV2, 'data'> & {
    data: CredentialAttributeContentDataModel;
};

export type DateAttributeContentDto = DateAttributeContentV2 | DateAttributeContentV3;
export type { DateAttributeContentDto as DateAttributeContentModel };

export type DateTimeAttributeContentDto = DateTimeAttributeContentV2 | DateTimeAttributeContentV3;
export type { DateTimeAttributeContentDto as DateTimeAttributeContentModel };

export type FileAttributeContentDataDto = FileAttributeContentData;
export type { FileAttributeContentDataDto as FileAttributeContentDataModel };

export type FileAttributeContentDto = FileAttributeContentV2 | FileAttributeContentV3;
export type FileAttributeContentModel = Omit<FileAttributeContentDto, 'data'> & { data: FileAttributeContentData };

export type CodeBlockAttributeContentDataDto = CodeBlockAttributeContentData;
export type { CodeBlockAttributeContentDataDto as CodeBlockAttributeContentDataModel };

export type CodeBlockAttributeContentDto = CodeBlockAttributeContentV2 | CodeBlockAttributeContentV3;
export type CodeBlockAttributeContentModel = Omit<CodeBlockAttributeContentDto, 'data'> & {
    data: CodeBlockAttributeContentData;
};

export type FloatAttributeContentDto = FloatAttributeContentV2 | FloatAttributeContentV3;
export type { FloatAttributeContentDto as FloatAttributeContentModel };

export type IntegerAttributeContentDto = IntegerAttributeContentV2 | IntegerAttributeContentV3;
export type { IntegerAttributeContentDto as IntegerAttributeContentModel };

export type ObjectAttributeContentDto = ObjectAttributeContentV2 | ObjectAttributeContentV3;
export type { ObjectAttributeContentDto as ObjectAttributeContentModel };

export type SecretAttributeContentDataDto = SecretAttributeContentData;
export type { SecretAttributeContentDataDto as SecretAttributeContentDataModel };

export type SecretAttributeContentDto = SecretAttributeContentV2;
export type SecretAttributeContentModel = Omit<SecretAttributeContentV2, 'data'> & { data: SecretAttributeContentData };

export type StringAttributeContentDto = StringAttributeContentV2 | StringAttributeContentV3;
export type { StringAttributeContentDto as StringAttributeContentModel };

export type TextAttributeContentDto = TextAttributeContentV2 | TextAttributeContentV3;
export type { TextAttributeContentDto as TextAttributeContentModel };

export type TimeAttributeContentDto = TimeAttributeContentV2 | TimeAttributeContentV3;
export type { TimeAttributeContentDto as TimeAttributeContentModel };

export type BaseAttributeContentDto = BaseAttributeContentDtoV2 | BaseAttributeContentDtoV3;
export type BaseAttributeContentModel =
    | BooleanAttributeContentDto
    | CredentialAttributeContentModel
    | DateAttributeContentDto
    | DateTimeAttributeContentDto
    | FileAttributeContentModel
    | FloatAttributeContentDto
    | IntegerAttributeContentDto
    | ObjectAttributeContentDto
    | SecretAttributeContentModel
    | StringAttributeContentDto
    | TextAttributeContentDto
    | TimeAttributeContentDto
    | CodeBlockAttributeContentModel;

export type AttributeRequestDto = RequestAttribute;
export type AttributeRequestModelV2 = Omit<RequestAttribute, 'content'> & { content: Array<BaseAttributeContentDtoV2> };
export type AttributeRequestModelV3 = Omit<RequestAttribute, 'content'> & { content: Array<BaseAttributeContentDtoV3> };
export type AttributeRequestModel = AttributeRequestModelV2 | AttributeRequestModelV3;

export type MappingAttributeDto = AttributeMappingDto;
export type { MappingAttributeDto as AttributeMappingModel };

export type AttributeResponseDto = ResponseAttribute;
export type AttributeResponseModelV2 = Omit<ResponseAttribute, 'content'> & { content?: Array<BaseAttributeContentDtoV2> };
export type AttributeResponseModelV3 = Omit<ResponseAttribute, 'content'> & { content?: Array<BaseAttributeContentDtoV3> };
export type AttributeResponseModel = AttributeResponseModelV2 | AttributeResponseModelV3;

export type DataAttributePropertiesDto = DataAttributeProperties;
export type { DataAttributePropertiesDto as DataAttributePropertiesModel };

export type DateTimeAttributeConstraintDataDto = DateTimeAttributeConstraintData;
export type { DateTimeAttributeConstraintDataDto as DateTimeAttributeConstraintDataModel };

export type DateTimeAttributeConstraintDto = DateTimeAttributeConstraint;
export type DateTimeAttributeConstraintModel = Omit<DateTimeAttributeConstraint, 'data'> & {
    data?: DateTimeAttributeConstraintData;
};

export type RangeAttributeConstraintDataDto = RangeAttributeConstraintData;
export type { RangeAttributeConstraintDataDto as RangeAttributeConstraintDataModel };

export type RangeAttributeConstraintDto = RangeAttributeConstraint;
export type RangeAttributeConstraintModel = Omit<RangeAttributeConstraint, 'data'> & { data?: RangeAttributeConstraintData };

export type RegexpAttributeConstraintDto = RegexpAttributeConstraint;
export type { RegexpAttributeConstraintDto as RegexpAttributeConstraintModel };

export type BaseAttributeConstraintDto = BaseAttributeConstraint;
export type BaseAttributeConstraintModel = DateTimeAttributeConstraintModel | RangeAttributeConstraintModel | RegexpAttributeConstraintDto;

export type AttributeCallbackMappingDto = AttributeCallbackMapping;
export type { AttributeCallbackMappingDto as AttributeCallbackMappingModel };

export type AttributeCallbackDto = AttributeCallback;
export type AttributeCallbackModel = Omit<AttributeCallback, 'mappings'> & { mappings: Array<AttributeCallbackMapping> };

export type DataAttributeDto = DataAttribute;
export type DataAttributeModel = Omit<DataAttribute, 'content | properties | constraints | attributeCallback'> & {
    content?: Array<BaseAttributeContentModel>;
    properties: DataAttributeProperties;
    constraints?: Array<BaseAttributeConstraintModel>;
    attributeCallback?: AttributeCallbackModel;
};

export type GroupAttributeDto = GroupAttributeV2 | GroupAttributeV3;
export type GroupAttributeModel = Omit<GroupAttributeDto, 'content | attributeCallback'> & {
    content?: Array<AttributeDescriptorModel>;
    attributeCallback?: AttributeCallbackModel;
};

export type InfoAttributePropertiesDto = InfoAttributeProperties;
export type { InfoAttributePropertiesDto as InfoAttributePropertiesModel };

export type InfoAttributeDto = InfoAttributeV2 | InfoAttributeV3;
export type InfoAttributeModel = Omit<InfoAttributeDto, 'content | properties'> & {
    content: Array<BaseAttributeContentModel>;
    properties: InfoAttributeProperties;
};

export type CustomAttributePropertiesDto = CustomAttributeProperties;
export type { CustomAttributePropertiesDto as CustomAttributePropertiesModel };

export type CustomAttributeDto = CustomAttribute;
export type CustomAttributeModel = Omit<CustomAttribute, 'content | properties'> & {
    content?: Array<BaseAttributeContentModel>;
    properties: CustomAttributeProperties;
};

export type MetadataAttributePropertiesDto = MetadataAttributeProperties;
export type { MetadataAttributePropertiesDto as MetadataAttributePropertiesModel };

export type MetadataAttributeDto = MetadataAttributeV2 | MetadataAttributeV3;
export type MetadataAttributeModel = Omit<MetadataAttributeDto, 'content | properties'> & {
    content: Array<BaseAttributeContentModel>;
    properties: MetadataAttributeProperties;
};

export type AttributeDescriptorDto = BaseAttributeDto;
export type AttributeDescriptorModel =
    | DataAttributeModel
    | GroupAttributeModel
    | InfoAttributeModel
    | CustomAttributeModel
    | MetadataAttributeModel;

export type AttributeDescriptorCollectionDto = {
    [functionGroup: string]: {
        [kind: string]: AttributeDescriptorDto[];
    };
};

export type AttributeDescriptorCollectionModel = {
    [functionGroup: string]: {
        [kind: string]: AttributeDescriptorModel[];
    };
};

export const isDataAttributeModel = (attribute: AttributeDescriptorModel): attribute is DataAttributeModel => {
    return attribute.type === AttributeType.Data;
};

export const isInfoAttributeModel = (attribute: AttributeDescriptorModel): attribute is InfoAttributeModel => {
    return attribute.type === AttributeType.Info;
};

export const isGroupAttributeModel = (attribute: AttributeDescriptorModel): attribute is GroupAttributeModel => {
    return attribute.type === AttributeType.Group;
};

export const isCustomAttributeModel = (attribute: AttributeDescriptorModel): attribute is CustomAttributeModel => {
    return attribute.type === AttributeType.Custom;
};

export const isCustomAttributeModelArray = (attributes: AttributeDescriptorModel[]): attributes is CustomAttributeModel[] => {
    return attributes.every(isCustomAttributeModel);
};

export const isAttributeDescriptorModel = (attribute: object): attribute is AttributeDescriptorModel => {
    return (
        (attribute as AttributeDescriptorModel).name !== undefined &&
        (attribute as AttributeDescriptorModel).uuid !== undefined &&
        (attribute as AttributeDescriptorModel).type !== undefined
    );
};
