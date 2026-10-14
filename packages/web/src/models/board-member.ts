/** A board member's card, as the `board_members` table keeps it. */
export interface BoardMember {
  id: string;
  name: string;
  title: string;
  /** Where the photo is inside its storage bucket, or empty without a photo. */
  photoPath: string;
  /** The photo's public address in storage, or empty without a photo. */
  photoUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  /** The member account this card belongs to, when it is linked to one. */
  userId: string | undefined;
  sortOrder: number;
}

/** What the form on the Boards tab hands over to save. */
export interface BoardMemberInput {
  /** Set when editing, and left out for a new card. */
  id?: string;
  name: string;
  title: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  userId: string | undefined;
  /** A new photo to upload. Without one, an existing photo stays. */
  photo?: File;
}
