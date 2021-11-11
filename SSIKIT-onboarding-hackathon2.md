# SSI Onboarding GaiaX hackathon #2

In this guide we'll outline how one can

1. Setup the walt.id SSIKIT
2. Using the SSIKIT to create a decentralized identifier to hold VCs
3. Get a Verifiable Credential, issued by an EBSI registered institution (in this case deltaDAO AG)
4. Create a Verifiable Presentation of the VC by signing with the created did (step 1)

## Setup walt.id SSIKIT

We'll outline the required steps in this tutorial. If you need further help please refer to the walt.id onboarding guide for more details: https://github.com/walt-id/waltid-oceandao-docs

1. Create a directory for the walt.id SSIKIT
   ```
   mkdir did-service && cd did-service
   ```
2. Pull the SSIKIT container
   ```
   docker pull docker.io/waltid/ssikit
   ```
3. Setup an alias for easy access to the CLI tool
   ```
   alias ssikit="docker container run -p 7000-7004:7000-7004 -itv $(pwd)/data:/app/data docker.io/waltid/ssikit"
   ```

## Create a decentralized identifier to hold VCs

After setting up the SSIKIT, head to the created directory and execute the following command:

```
ssikit did create -m key
```

This will create a simple did:key. The output should look similar to the following:

```
DID created: did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD
DID document (below, JSON):

{
    ...
}
```

You can now sign Verifiable Credentials using the created DID document and the walt.id SSIKIT. More on that in step 4: Presenting the Verifiable Credential

## Get a Verifiable Credential issued by an external EBSI registered organization

In the current state you can communicate your public DID key (in hte example above this would be `did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD`) as well as the required information (Refer to the [GaiaxCredential Template here](https://github.com/deltaDAO/files/blob/main/vc.json)) to deltaDAO in our hackathon sessions or simply message us at contact@delta-dao.com.

```
TODO: automate API
```

We will then process your public information and issue an VC for you. This will be send back to you, so that you can create a VP.

## Present your Verifiable Credential

To create a Verifiable Presentation you need to sign the Verifiable Credential using the DID created in step 2. You can then upload the presentation to make it verifiable by any walt.id SSIKIT Auditor.
For example you can register it with an VP Registry, like the one we provide at [vp-registry.gaiax.delta-dao.com](vp-registry.gaiax.delta-dao.com) through any supported MVG portal e.g. [portal.minimal-gaia-x.eu](portal.minimal-gaia-x.eu).

Once you received your VC head back to the created directory from step 1. Here you can use the following command to sign and present your VC:

```
ssikit vc present --holder-did did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD data/vc.json
```

Please note that the `--holder-did` parameter should reference the public DID key generated in Step 2. You can replace `data/vc.json` with the correct path to your Verifiable Credential.

Once you executed the command you should receive an output similar to this:

```
Results:

Verifiable presentation generated for holder DID: "did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD"
Verifiable presentation document (below, JSON):

{
  ...
}

Verifiable presentation was saved to file: "data/vc/presented/vp-1636639107954.json"
```

You will find your Verifiable Presentation at the mentioned location. To register it with a registry please follow our dedicated guide on `TODO`.
