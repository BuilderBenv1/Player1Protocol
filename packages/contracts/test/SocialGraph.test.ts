import { expect } from "chai";
import { ethers } from "hardhat";
import { SocialGraph } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SocialGraph", function () {
  let social: SocialGraph;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charlie: SignerWithAddress;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SocialGraph");
    social = await Factory.deploy();
    await social.waitForDeployment();
  });

  describe("Follow", function () {
    it("should follow another player", async function () {
      await expect(social.connect(alice).follow(bob.address))
        .to.emit(social, "Followed")
        .withArgs(alice.address, bob.address);

      expect(await social.isFollowing(alice.address, bob.address)).to.be.true;
    });

    it("should update following/follower counts", async function () {
      await social.connect(alice).follow(bob.address);
      expect(await social.getFollowingCount(alice.address)).to.equal(1);
      expect(await social.getFollowerCount(bob.address)).to.equal(1);
    });

    it("should reject following self", async function () {
      await expect(social.connect(alice).follow(alice.address))
        .to.be.revertedWith("Cannot follow self");
    });

    it("should reject double follow", async function () {
      await social.connect(alice).follow(bob.address);
      await expect(social.connect(alice).follow(bob.address))
        .to.be.revertedWith("Already following");
    });

    it("should reject if blocked", async function () {
      await social.connect(bob).blockPlayer(alice.address);
      await expect(social.connect(alice).follow(bob.address))
        .to.be.revertedWith("You are blocked");
    });
  });

  describe("Unfollow", function () {
    it("should unfollow a player", async function () {
      await social.connect(alice).follow(bob.address);
      await expect(social.connect(alice).unfollow(bob.address))
        .to.emit(social, "Unfollowed");

      expect(await social.isFollowing(alice.address, bob.address)).to.be.false;
      expect(await social.getFollowingCount(alice.address)).to.equal(0);
    });

    it("should reject unfollowing someone not followed", async function () {
      await expect(social.connect(alice).unfollow(bob.address))
        .to.be.revertedWith("Not following");
    });
  });

  describe("Friends (Mutual Follow)", function () {
    it("should detect mutual friends", async function () {
      await social.connect(alice).follow(bob.address);
      expect(await social.areFriends(alice.address, bob.address)).to.be.false;

      await social.connect(bob).follow(alice.address);
      expect(await social.areFriends(alice.address, bob.address)).to.be.true;
    });

    it("should return friends list", async function () {
      await social.connect(alice).follow(bob.address);
      await social.connect(bob).follow(alice.address);
      await social.connect(alice).follow(charlie.address);

      const friends = await social.getFriends(alice.address);
      expect(friends.length).to.equal(1);
      expect(friends[0]).to.equal(bob.address);
    });
  });

  describe("Block", function () {
    it("should block a player", async function () {
      await expect(social.connect(alice).blockPlayer(bob.address))
        .to.emit(social, "Blocked");

      expect(await social.blocked(alice.address, bob.address)).to.be.true;
    });

    it("should auto-remove follower when blocked", async function () {
      await social.connect(bob).follow(alice.address);
      expect(await social.getFollowerCount(alice.address)).to.equal(1);

      await social.connect(alice).blockPlayer(bob.address);
      expect(await social.getFollowerCount(alice.address)).to.equal(0);
      expect(await social.isFollowing(bob.address, alice.address)).to.be.false;
    });

    it("should unblock a player", async function () {
      await social.connect(alice).blockPlayer(bob.address);
      await expect(social.connect(alice).unblockPlayer(bob.address))
        .to.emit(social, "Unblocked");

      expect(await social.blocked(alice.address, bob.address)).to.be.false;
    });

    it("should reject blocking self", async function () {
      await expect(social.connect(alice).blockPlayer(alice.address))
        .to.be.revertedWith("Cannot block self");
    });
  });

  describe("Bio", function () {
    it("should set bio", async function () {
      await expect(social.connect(alice).setBio("Competitive gamer"))
        .to.emit(social, "BioUpdated");

      expect(await social.bio(alice.address)).to.equal("Competitive gamer");
    });

    it("should reject bio over 280 chars", async function () {
      const longBio = "a".repeat(281);
      await expect(social.connect(alice).setBio(longBio))
        .to.be.revertedWith("Bio too long");
    });
  });

  describe("View Functions", function () {
    it("should return following list", async function () {
      await social.connect(alice).follow(bob.address);
      await social.connect(alice).follow(charlie.address);

      const following = await social.getFollowing(alice.address);
      expect(following.length).to.equal(2);
    });

    it("should return followers list", async function () {
      await social.connect(alice).follow(charlie.address);
      await social.connect(bob).follow(charlie.address);

      const followers = await social.getFollowers(charlie.address);
      expect(followers.length).to.equal(2);
    });
  });
});
