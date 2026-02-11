import { expect } from "chai";
import { ethers } from "hardhat";
import { Club } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Club", function () {
  let club: Club;
  let owner: SignerWithAddress;
  let admin2: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let outsider: SignerWithAddress;

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MEMBER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_ROLE"));

  beforeEach(async function () {
    [owner, admin2, member1, member2, outsider] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Club");
    club = await Factory.deploy(
      "Alpha Squad", "ALPHA", "Top competitive team",
      owner.address, 0, 50, false
    );
    await club.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set club info", async function () {
      expect(await club.name()).to.equal("Alpha Squad");
      expect(await club.tag()).to.equal("ALPHA");
      expect(await club.owner()).to.equal(owner.address);
      expect(await club.getMemberCount()).to.equal(1);
    });

    it("should include owner as member", async function () {
      expect(await club.isMember(owner.address)).to.be.true;
    });

    it("should reject invalid name length", async function () {
      const Factory = await ethers.getContractFactory("Club");
      await expect(
        Factory.deploy("", "TAG", "desc", owner.address, 0, 10, false)
      ).to.be.revertedWith("Invalid name");
    });
  });

  describe("Join / Leave", function () {
    it("should allow joining free club", async function () {
      const tx = await club.connect(member1).join();
      await expect(tx).to.emit(club, "MemberJoined");
      expect(await club.isMember(member1.address)).to.be.true;
      expect(await club.getMemberCount()).to.equal(2);
    });

    it("should reject double join", async function () {
      await club.connect(member1).join();
      await expect(club.connect(member1).join())
        .to.be.revertedWith("Already member");
    });

    it("should allow leaving", async function () {
      await club.connect(member1).join();
      const tx = await club.connect(member1).leave();
      await expect(tx).to.emit(club, "MemberLeft");
      expect(await club.isMember(member1.address)).to.be.false;
    });

    it("should reject owner leaving", async function () {
      await expect(club.connect(owner).leave())
        .to.be.revertedWith("Owner cannot leave");
    });
  });

  describe("Invite Only", function () {
    beforeEach(async function () {
      const Factory = await ethers.getContractFactory("Club");
      club = await Factory.deploy(
        "VIP Club", "VIP", "Exclusive", owner.address, 0, 10, true
      );
    });

    it("should reject non-invited join", async function () {
      await expect(club.connect(member1).join())
        .to.be.revertedWith("Invite required");
    });

    it("should allow invited player to join", async function () {
      await club.connect(owner).invite(member1.address);
      await club.connect(member1).join();
      expect(await club.isMember(member1.address)).to.be.true;
    });
  });

  describe("Membership Fee", function () {
    beforeEach(async function () {
      const Factory = await ethers.getContractFactory("Club");
      club = await Factory.deploy(
        "Paid Club", "PAID", "Premium", owner.address,
        ethers.parseEther("0.1"), 10, false
      );
    });

    it("should collect fee on join", async function () {
      await club.connect(member1).join({ value: ethers.parseEther("0.1") });
      expect(await club.treasury()).to.equal(ethers.parseEther("0.1"));
    });

    it("should reject insufficient fee", async function () {
      await expect(
        club.connect(member1).join({ value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Insufficient fee");
    });
  });

  describe("Admin Controls", function () {
    beforeEach(async function () {
      await club.connect(member1).join();
      await club.connect(member2).join();
    });

    it("should kick member", async function () {
      const tx = await club.connect(owner).kick(member1.address);
      await expect(tx).to.emit(club, "MemberKicked");
      expect(await club.isMember(member1.address)).to.be.false;
    });

    it("should reject kicking owner", async function () {
      await expect(club.connect(owner).kick(owner.address))
        .to.be.revertedWith("Cannot kick owner");
    });

    it("should promote member to admin", async function () {
      await club.connect(owner).promote(member1.address);
      expect(await club.hasRole(ADMIN_ROLE, member1.address)).to.be.true;
    });

    it("should demote admin", async function () {
      await club.connect(owner).promote(member1.address);
      await club.connect(owner).demote(member1.address);
      expect(await club.hasRole(ADMIN_ROLE, member1.address)).to.be.false;
    });

    it("should reject demoting owner", async function () {
      await expect(club.connect(owner).demote(owner.address))
        .to.be.revertedWith("Cannot demote owner");
    });

    it("should transfer ownership", async function () {
      await club.connect(owner).transferOwnership(member1.address);
      expect(await club.owner()).to.equal(member1.address);
    });
  });

  describe("Treasury", function () {
    it("should accept deposits from members", async function () {
      await club.connect(member1).join();
      await club.connect(member1).depositToTreasury({ value: ethers.parseEther("1") });
      expect(await club.treasury()).to.equal(ethers.parseEther("1"));
    });

    it("should reject deposits from non-members", async function () {
      await expect(
        club.connect(outsider).depositToTreasury({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Members only");
    });

    it("should allow owner to withdraw", async function () {
      await club.connect(member1).join();
      await club.connect(member1).depositToTreasury({ value: ethers.parseEther("1") });

      const before = await ethers.provider.getBalance(owner.address);
      await club.connect(owner).withdrawFromTreasury(owner.address, ethers.parseEther("0.5"));
      const after = await ethers.provider.getBalance(owner.address);

      expect(after).to.be.greaterThan(before);
      expect(await club.treasury()).to.equal(ethers.parseEther("0.5"));
    });
  });

  describe("View Functions", function () {
    it("should return club info", async function () {
      const info = await club.getClubInfo();
      expect(info._name).to.equal("Alpha Squad");
      expect(info._tag).to.equal("ALPHA");
      expect(info._owner).to.equal(owner.address);
    });

    it("should return members list", async function () {
      await club.connect(member1).join();
      const members = await club.getMembers();
      expect(members.length).to.equal(2);
    });
  });
});
