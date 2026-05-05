type EditIconProps = Readonly<{
    size?: number;
    className?: string;
    dataTestId?: string;
}>;

function EditIcon({ size = 16, className, dataTestId = 'edit-icon' }: EditIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            data-testid={dataTestId}
        >
            <path
                d="M2.66663 8.99998V2.66665C2.66663 2.31302 2.8071 1.97389 3.05715 1.72384C3.3072 1.47379 3.64634 1.33331 3.99996 1.33331H9.66663L13.3333 4.99998V13.3333C13.3333 13.6869 13.1928 14.0261 12.9428 14.2761C12.6927 14.5262 12.3536 14.6666 12 14.6666H8.33329"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9.33337 1.33331V5.33331H13.3334" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M6.94663 8.40665C7.07663 8.27664 7.23098 8.17352 7.40084 8.10316C7.57071 8.0328 7.75277 7.99658 7.93663 7.99658C8.12049 7.99658 8.30255 8.0328 8.47241 8.10316C8.64227 8.17352 8.79662 8.27664 8.92663 8.40665C9.05663 8.53666 9.15976 8.691 9.23012 8.86087C9.30048 9.03073 9.3367 9.21279 9.3367 9.39665C9.3367 9.58051 9.30048 9.76257 9.23012 9.93244C9.15976 10.1023 9.05663 10.2566 8.92663 10.3867L5.29996 14L2.66663 14.6667L3.32663 12.0333L6.94663 8.40665Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default EditIcon;
