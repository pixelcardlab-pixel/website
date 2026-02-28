import Image from "next/image";

export function FounderNote() {
  return (
    <section className="founder-note reveal">
      <div className="founder-note-image">
        <Image src="/dan-founder-wide.png" alt="Dan from Pixel Card Lab" fill sizes="120px" />
      </div>
      <div className="founder-note-body">
        <p>
          As a passionate card enthusiast inspired by a magical childhood of loyalty and friendship, I am excited to
          share these cards with you. They are more than collectibles, they are little pieces of nostalgia that bring
          back memories of the friends who were by our side back then.
        </p>
        <p>
          Thank you for your support, my fellow trainers.
        </p>
        <p className="founder-signoff">Cheers, Dan</p>
      </div>
    </section>
  );
}
