import type { DataItem } from "../../core/render/Component";
import type * as d3hierarchy from "d3-hierarchy";

import { Hierarchy, IHierarchySettings, IHierarchyDataItem, IHierarchyPrivate, IHierarchyEvents } from "./Hierarchy";
import { Container } from "../../core/render/Container";
import { LinkedHierarchyNode } from "./LinkedHierarchyNode";
import { HierarchyLink } from "./HierarchyLink";
import { Template } from "../../core/util/Template";
import { Circle } from "../../core/render/Circle";
import { ListTemplate } from "../../core/util/List";
import type { IPoint } from "../../core/util/IPoint";

import * as $array from "../../core/util/Array";
import * as $utils from "../../core/util/Utils";

/**
 * @ignore
 */
export interface ILinkedHierarchyDataObject {
	name?: string,
	value?: number,
	children?: ILinkedHierarchyDataObject[],
	dataItem?: DataItem<ILinkedHierarchyDataItem>
};

export interface ILinkedHierarchyDataItem extends IHierarchyDataItem {

	/**
	 * An array of child data items.
	 */
	children: Array<DataItem<ILinkedHierarchyDataItem>>;

	/**
	 * A data item of a parent node.
	 */
	parent: DataItem<ILinkedHierarchyDataItem>;

	/**
	 * A related node.
	 */
	node: LinkedHierarchyNode;

	/**
	 * [[Circle]] element of the related node.
	 */
	circle: Circle;

	/**
	 * [[Circle]] element of the related node, representing outer circle.
	 */
	outerCircle: Circle;

	/**
	 * A [[HierarchyLink]] leading to parent node.
	 */
	parentLink: HierarchyLink;

	/**
	 * An [[HierarchyLink]] leading to parent node.
	 */
	links: Array<HierarchyLink>;

	/**
	 * An array of [[HierarchyLink]] objects leading to child nodes.
	 */
	childLinks: Array<HierarchyLink>;

	/**
	 * An array of IDs of directly linked nodes.
	 */
	linkWith: Array<string>;

	/**
	 * @ignore
	 */
	d3HierarchyNode: d3hierarchy.HierarchyPointNode<ILinkedHierarchyDataObject>;

}

export interface ILinkedHierarchySettings extends IHierarchySettings {

	/**
	 * A field in data which holds IDs of nodes to link with.
	 */
	linkWithField?: string;

}

export interface ILinkedHierarchyPrivate extends IHierarchyPrivate {
}

export interface ILinkedHierarchyEvents extends IHierarchyEvents {
}

/**
 * A base class for linked hierarchy series.
 */
export abstract class LinkedHierarchy extends Hierarchy {

	public static className: string = "LinkedHierarchy";
	public static classNames: Array<string> = Hierarchy.classNames.concat([LinkedHierarchy.className]);

	declare public _settings: ILinkedHierarchySettings;
	declare public _privateSettings: ILinkedHierarchyPrivate;
	declare public _dataItemSettings: ILinkedHierarchyDataItem;
	declare public _events: ILinkedHierarchyEvents;

	protected _afterNew() {
		this.fields.push("linkWith", "x", "y");

		super._afterNew();
	}

	/**
	 * A list of nodes in a [[LinkedHierarchy]] chart.
	 *
	 * @default new ListTemplate<LinkedHierarchyNode>
	 */
	public readonly nodes: ListTemplate<LinkedHierarchyNode> = new ListTemplate(
		Template.new({}),
		() => LinkedHierarchyNode.new(this._root, {
			themeTags: $utils.mergeTags(this.nodes.template.get("themeTags", []), [this._tag, "linkedhierarchy", "hierarchy", "node"]),
			x: this.width() / 2,
			y: this.height() / 2
		}, this.nodes.template)
	);

	/**
	 * A list of node circle elements in a [[LinkedHierarchy]] chart.
	 *
	 * @default new ListTemplate<Circle>
	 */
	public readonly circles: ListTemplate<Circle> = new ListTemplate(
		Template.new({}),
		() => Circle.new(this._root, {
			themeTags: $utils.mergeTags(this.circles.template.get("themeTags", []), [this._tag, "linkedhierarchy", "hierarchy", "node", "shape"])
		}, this.circles.template)
	);

	/**
	 * A list of node outer circle elements in a [[LinkedHierarchy]] chart.
	 *
	 * @default new ListTemplate<Circle>
	 */
	public readonly outerCircles: ListTemplate<Circle> = new ListTemplate(
		Template.new({}),
		() => Circle.new(this._root, {
			themeTags: $utils.mergeTags(this.outerCircles.template.get("themeTags", []), [this._tag, "linkedhierarchy", "hierarchy", "node", "outer", "shape"])
		}, this.outerCircles.template)
	);

	/**
	 * A list of link elements in a [[LinkedHierarchy]] chart.
	 *
	 * @default new ListTemplate<HierarchyLink>
	 */
	public readonly links: ListTemplate<HierarchyLink> = new ListTemplate(
		Template.new({}),
		() => HierarchyLink.new(this._root, {
			themeTags: $utils.mergeTags(this.links.template.get("themeTags", []), [this._tag, "linkedhierarchy", "hierarchy", "link"])
		}, this.links.template)
	);

	/**
	 * A [[Container]] that link elements are placed in.
	 *
	 * @default Container.new()
	 */
	public readonly linksContainer = this.children.moveValue(Container.new(this._root, {}), 0);

	/**
	 * @ignore
	 */
	public makeNode(dataItem: DataItem<this["_dataItemSettings"]>): LinkedHierarchyNode {
		const node = super.makeNode(dataItem) as LinkedHierarchyNode;

		const circle = node.children.moveValue(this.circles.make(), 0);
		this.circles.push(circle);
		node.setPrivate("tooltipTarget", circle);
		dataItem.set("circle", circle);

		const outerCircle = node.children.moveValue(this.outerCircles.make(), 0);
		this.outerCircles.push(outerCircle);
		dataItem.set("outerCircle", outerCircle);

		const label = dataItem.get("label");

		circle.on("radius", () => {
			const d = circle.get("radius", this.width()) * 2;
			label.setAll({ maxWidth: d, maxHeight: d })

			outerCircle.set("radius", d / 2);

			this._handleRadiusChange();
		})

		const d = circle.get("radius", this.width()) * 2;
		label.setAll({ maxWidth: d, maxHeight: d });

		return node;
	}

	public _handleRadiusChange() {

	}

	protected processDataItem(dataItem: DataItem<this["_dataItemSettings"]>) {
		dataItem.set("childLinks", []);
		dataItem.set("links", []);
		super.processDataItem(dataItem);
	}

	protected _processDataItem(dataItem: DataItem<this["_dataItemSettings"]>) {
		super._processDataItem(dataItem);

		const parentDataItem = dataItem.get("parent");
		if (parentDataItem) {
			const link = this.linkDataItems(parentDataItem, dataItem);
			dataItem.set("parentLink", link);
		}

		const node = dataItem.get("node");
		this.updateLinkWith(this.dataItems);
		node._updateLinks(0);
	}

	/**
	 * @ignore
	 */
	public updateLinkWith(dataItems: Array<DataItem<this["_dataItemSettings"]>>) {
		$array.each(dataItems, (dataItem) => {
			const linkWith = dataItem.get("linkWith");
			if (linkWith) {
				$array.each(linkWith, (id) => {
					const linkWithDataItem = this._getDataItemById(this.dataItems, id);

					if (linkWithDataItem) {
						this.linkDataItems(dataItem, linkWithDataItem);
					}
				})
			}

			const children = dataItem.get("children");
			if (children) {
				this.updateLinkWith(children);
			}
		})
	}

	protected _getPoint(hierarchyNode: this["_dataItemSettings"]["d3HierarchyNode"]): IPoint {
		return { x: hierarchyNode.x, y: hierarchyNode.y };
	}

	protected _updateNode(dataItem: DataItem<this["_dataItemSettings"]>) {
		super._updateNode(dataItem);

		const node = dataItem.get("node");
		const hierarchyNode = dataItem.get("d3HierarchyNode");

		const point = this._getPoint(hierarchyNode);

		const duration = this.get("animationDuration", 0);
		const easing = this.get("animationEasing");

		node.animate({ key: "x", to: point.x, duration: duration, easing: easing });
		node.animate({ key: "y", to: point.y, duration: duration, easing: easing });

		const hierarchyChildren = hierarchyNode.children;
		if (hierarchyChildren) {
			$array.each(hierarchyChildren, (hierarchyChild) => {
				this._updateNodes(hierarchyChild)
			})
		}

		const fill = dataItem.get("fill");
		const circle = dataItem.get("circle");
		const children = dataItem.get("children");
		if (circle) {
			circle.setAll({ fill: fill, stroke: fill });
		}

		const outerCircle = dataItem.get("outerCircle");
		if (outerCircle) {
			outerCircle.setAll({ fill: fill, stroke: fill });

			if (!children || children.length == 0) {
				outerCircle.setPrivate("visible", false);
			}
		}
	}

	/**
	 * Link two data items wit a link element.
	 *
	 * @param   source    Source node data item
	 * @param   target    Target node data item
	 * @param   strength  Link strength
	 * @return            Link element
	 */
	public linkDataItems(source: DataItem<this["_dataItemSettings"]>, target: DataItem<this["_dataItemSettings"]>, strength?: number): HierarchyLink {

		let link!: HierarchyLink;

		const sourceLinks = source.get("links");

		if (sourceLinks) {
			$array.each(sourceLinks, (lnk) => {
				if (lnk.get("target") == target) {
					link = lnk;
				}
			})
		}

		const targetLinks = target.get("links");

		if (targetLinks) {
			$array.each(targetLinks, (lnk) => {
				if (lnk.get("target") == source) {
					link = lnk;
				}
			})
		}

		if (!link) {
			link = this.links.make();
			this.links.push(link);
			this.linksContainer.children.push(link);
			link.set("source", source);
			link.set("target", target);
			link._setDataItem(source);
			link.set("stroke", source.get("fill"));
			if (strength != null) {
				link.set("strength", strength)
			}

			source.get("childLinks").push(link);

			$array.move(source.get("links"), link);
			$array.move(target.get("links"), link);

			this._processLink(link, source, target);
		}

		return link;
	}

	protected _processLink(_link: HierarchyLink, _source: DataItem<this["_dataItemSettings"]>, _target: DataItem<this["_dataItemSettings"]>) {

	}

	/**
	 * @ignore
	 */
	public disposeDataItem(dataItem: DataItem<this["_dataItemSettings"]>) {
		super.disposeDataItem(dataItem);
		const links = dataItem.get("links");
		if (links) {
			$array.each(links, (link) => {
				this.links.removeValue(link);
				link.dispose();
			})
		}
	}

	/**
	 * Select a data item.
	 * @param  dataItem  Data item
	 */
	public selectDataItem(dataItem: DataItem<this["_dataItemSettings"]>) {
		const parent = dataItem.get("parent");

		if (!dataItem.get("disabled")) {
			this.set("selectedDataItem", dataItem);
			this._selectDataItem(dataItem);
		}
		else {
			if (parent) {
				this.setRaw("selectedDataItem", parent);
				const type = "dataitemselected";
				this.events.dispatch(type, { type: type, target: this, dataItem: parent });
				this.disableDataItem(dataItem);
			}
		}
	}
}